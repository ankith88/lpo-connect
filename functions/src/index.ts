import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Initialize admin once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Database helper - Specify the named database if needed
const getDB = () => getFirestore("lpoconnect");

// Logic: onCustomerActive
export const onCustomerActive = onDocumentUpdated({
  document: "lpo/{lpoId}/customers/{customerId}",
  database: "lpoconnect",
}, async (event) => {
  const newData = event.data?.after.data();
  const oldData = event.data?.before.data();

  if (!newData || !oldData) return;

  if (newData.status === "Active" && oldData.status !== "Active") {
    const netsuiteId = newData.companyId || newData.netsuiteId;
    const companyName = newData.companyName;

    if (!netsuiteId && !companyName) {
      console.log("No ID or name found for customer activation.");
      return;
    }

    const firestore = getDB();
    const requestsRef = firestore.collection("requests");
    let query;

    if (netsuiteId) {
      query = requestsRef.where("netsuiteCustomerId", "==", netsuiteId);
    } else {
      query = requestsRef.where("customer.company", "==", companyName);
    }

    const snapshot = await query
      .where("status", "==", "awaiting-activation")
      .get();

    if (snapshot.empty) {
      console.log(`No queued requests found for customer: ${companyName}`);
      return;
    }

    console.log(`Activating ${snapshot.size} requests for ${companyName}`);
    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "pending",
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        activationReason: "Customer became Active",
      });
    });

    await batch.commit();
    console.log("Batch activation complete.");
  }
});

// Logic: callNetSuite
export const callNetSuite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { url } = request.data;
  if (!url) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'url' argument.");
  }

  console.log(`Calling NetSuite URL: ${url}`);
  try {
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("NetSuite Proxy Error:", error);
    throw new HttpsError("internal", "Failed to communicate with NetSuite API.");
  }
});

// Logic: onChatMessageSent
export const onChatMessageSent = onDocumentUpdated({
  document: "requests/{requestId}",
  database: "lpoconnect",
}, async (event) => {
  const afterData = event.data?.after.data();
  const beforeData = event.data?.before.data();

  if (!afterData || !beforeData) return;

  const afterChat = afterData.chat || [];
  const beforeChat = beforeData.chat || [];

  if (afterChat.length > beforeChat.length) {
    const lastMessage = afterChat[afterChat.length - 1];
    const sender = lastMessage.sender;
    const text = lastMessage.text;
    const requestId = event.params.requestId;

    const messaging = admin.messaging();
    const db = getDB();

    if (sender === 'user') {
      const lpoId = afterData.lpo_id;
      if (!lpoId) return;

      const usersSnapshot = await db.collection('users')
        .where('lpo_id', '==', lpoId)
        .get();

      const tokens: string[] = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
          tokens.push(...userData.fcmTokens);
        }
      });

      if (tokens.length > 0) {
        const payload = {
          notification: {
            title: `New message from ${afterData.customer.company}`,
            body: text,
            clickAction: `https://mp-lpo-connect.web.app/request/${requestId}`
          },
          tokens: [...new Set(tokens)]
        };

        const response = await messaging.sendEachForMulticast(payload);
        console.log(`Successfully sent ${response.successCount} operator notifications.`);
      }
    } else if (sender === 'operator') {
      const tokens = afterData.customerTokens || [];
      
      if (tokens.length > 0) {
        const payload = {
          notification: {
            title: 'Message from MailPlus Operator',
            body: text,
            clickAction: `https://mp-lpo-connect.web.app/request/${requestId}`
          },
          tokens: [...new Set(tokens)] as string[]
        };

        const response = await messaging.sendEachForMulticast(payload);
        console.log(`Successfully sent ${response.successCount} customer notifications.`);
      }
    }
  }
});

// Logic: updateJobStatus
export const updateJobStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const { jobId, collectionName, status, stops } = request.data;

  if (!jobId || !collectionName) {
    throw new HttpsError("invalid-argument", "jobId and collectionName are required.");
  }

  if (!['jobs', 'requests'].includes(collectionName)) {
    throw new HttpsError("invalid-argument", "collectionName must be either 'jobs' or 'requests'.");
  }

  const db = getDB();
  const docRef = db.collection(collectionName).doc(jobId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new HttpsError("not-found", "Job not found.");
  }

  const jobData = docSnap.data();
  if (!jobData) {
    throw new HttpsError("internal", "Job data is empty.");
  }

  const updatedData: any = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  let currentStops = [...(jobData.stops || [])];
  let stopsUpdated = false;

  if (stops && Array.isArray(stops)) {
    stops.forEach((stopUpdate: { index: number, status: string }) => {
      const { index, status: stopStatus } = stopUpdate;
      if (currentStops[index]) {
        currentStops[index] = { ...currentStops[index], status: stopStatus };
        stopsUpdated = true;
      }
    });
    updatedData.stops = currentStops;
  }

  if (status) {
    updatedData.status = status;
  } else if (stopsUpdated) {
    const allCompleted = currentStops.every((s: any) => s.status === 'completed');
    const anyCompleted = currentStops.some((s: any) => s.status === 'completed');

    if (allCompleted) {
      updatedData.status = 'completed';
    } else if (anyCompleted) {
      updatedData.status = 'in-progress';
    }
  }

  await docRef.update(updatedData);

  return { 
    success: true, 
    jobId, 
    status: updatedData.status || jobData.status,
    stopsUpdated
  };
});

// Logic: generateDailyScheduledJobs
export const generateDailyScheduledJobs = onSchedule({
  schedule: "5 0 * * *", // 12:05 AM every day
  timeZone: "Australia/Sydney", // Adjust to LPO timezone
}, async (event) => {
  const db = getDB();
  
  // Use Australia/Sydney timezone for date calculations
  const sydneyTimeFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });
  
  // parts will look like: [ { type: 'weekday', value: 'Wed' }, ... ]
  const parts = sydneyTimeFormatter.formatToParts(new Date());
  
  let year = '';
  let month = '';
  let day = '';
  let todayDayName = '';
  
  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'weekday') todayDayName = part.value;
  }
  
  // Sometimes 'short' weekday returns "Wed." or "Wed", we just need the first 3 chars
  todayDayName = todayDayName.substring(0, 3);
  
  const todayStr = `${year}-${month}-${day}`;
  
  const scheduledJobsRef = db.collection('scheduled_jobs');
  const jobsRef = db.collection('jobs');
  
  const snapshot = await scheduledJobsRef.where('status', '==', 'accepted').get();
  let generatedCount = 0;

  const batch = db.batch();
  let operationsInBatch = 0;

  for (const doc of snapshot.docs) {
    const template = doc.data();
    
    // Check if job is stopped or skipped today
    if (template.recurrenceStatus === 'stopped') continue;
    if (template.skippedDates && template.skippedDates.includes(todayStr)) continue;
    
    // Check if the template has started
    if (template.date > todayStr) continue;
    
    // Check if today matches the frequency
    if (template.frequency && Array.isArray(template.frequency) && template.frequency.includes(todayDayName)) {
      
      // Avoid duplicate generation for this exact template + date
      const existingInstances = await jobsRef
        .where('scheduledJobId', '==', doc.id)
        .where('date', '==', todayStr)
        .get();
        
      if (existingInstances.empty) {
        // Create new instance
        const newJobRef = jobsRef.doc();
        batch.set(newJobRef, {
          ...template, // Copies all fields including stops
          jobType: 'scheduled_instance',
          scheduledJobId: doc.id,
          date: todayStr,
          status: 'accepted',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        generatedCount++;
        operationsInBatch++;
        
        // Firestore batch limit is 500
        if (operationsInBatch >= 450) {
          await batch.commit();
          operationsInBatch = 0;
        }
      }
    }
  }

  if (operationsInBatch > 0) {
    await batch.commit();
  }

  console.log(`Generated ${generatedCount} daily scheduled jobs for ${todayStr}`);
});
