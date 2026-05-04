import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as nodemailer from "nodemailer";

// Initialize admin once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Database helper - Specify the named database if needed
const getDB = () => getFirestore("lpoconnect");

// Secrets
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const netsuiteApiKey = defineSecret("NETSUITE_API_KEY");

// Logic: onJobRequestCreated (Email Automation)
export const onJobRequestCreated = onDocumentCreated({
  document: "requests/{requestId}",
  database: "lpoconnect",
  secrets: [gmailAppPassword],
}, async (event) => {
  const snapshot = event.data;
  const requestId = event.params.requestId;
  console.log(`[Trigger Check] onJobRequestCreated triggered for ID: ${requestId}`);
  
  if (!snapshot) {
    console.error(`[Trigger Error] No snapshot data for request ${requestId}`);
    return;
  }
  const data = snapshot.data();

  const customerEmail = data.customer?.email;
  const companyName = data.customer?.company || "Unknown Company";
  const firstName = data.customer?.firstName || "there";
  const serviceType = data.service || "Standard Service";
  const date = data.date || "To be confirmed";

  if (!customerEmail) {
    console.warn(`No customer email found for request ${requestId}. Skipping email confirmation.`);
    return;
  }

  console.log(`[Email Automation] Preparing confirmation for ${customerEmail} (Request: ${requestId})`);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "bookings@lpo.plus",
      pass: gmailAppPassword.value(),
    },
  });

  // Format service name for display
  const displayService = typeof serviceType === 'string' 
    ? serviceType.replace(/-/g, ' ').toUpperCase() 
    : "SERVICE REQUESTED";

  const mailOptions = {
    from: '"LPO.PLUS Bookings" <bookings@lpo.plus>',
    to: customerEmail,
    replyTo: "bookings@lpo.plus",
    subject: `Booking Confirmation: ${companyName} (${displayService})`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .email-container {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            border: 1px solid #f0f0f0;
          }
          .header {
            background-color: #095c7b;
            padding: 40px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 300;
            letter-spacing: 1px;
          }
          .header span {
            color: #EAF044;
            font-weight: bold;
          }
          .content {
            padding: 40px 30px;
            color: #333333;
            line-height: 1.6;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #095c7b;
          }
          .job-details {
            background-color: #f8fafb;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
            border-left: 4px solid #EAF044;
          }
          .detail-row {
            margin-bottom: 12px;
            display: flex;
          }
          .detail-label {
            font-weight: bold;
            width: 120px;
            color: #666;
            font-size: 13px;
            text-transform: uppercase;
          }
          .detail-value {
            color: #095c7b;
            font-weight: 600;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .btn-primary {
            background-color: #EAF044;
            color: #095c7b;
            padding: 16px 32px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 8px;
            display: inline-block;
            transition: background 0.3s;
            box-shadow: 0 4px 12px rgba(234, 240, 68, 0.3);
          }
          .footer {
            background-color: #f4f7f8;
            padding: 30px;
            text-align: center;
            font-size: 12px;
            color: #999;
          }
          .footer p {
            margin: 5px 0;
          }
          .social-links {
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>LPO<span>.PLUS</span></h1>
          </div>
          <div class="content">
            <div class="greeting">Booking Received</div>
            <p>Hello ${firstName},</p>
            <p>Thank you for choosing LPO.PLUS. We have received your job request for <strong>${companyName}</strong> and it is currently being processed by our dispatch team.</p>
            
            <div class="job-details">
              <div class="detail-row">
                <span class="detail-label">Reference:</span>
                <span class="detail-value">#${requestId.substring(0, 8).toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span class="detail-value">${displayService}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${date}</span>
              </div>
            </div>

            <p>You can track the live status of your request, view logistics details, or chat directly with your operator through our portal.</p>
            
            <!--
            <div class="button-container">
              <a href="https://mp-lpo-connect.web.app/request/${requestId}" class="btn-primary">
                VIEW JOB DETAILS
              </a>
            </div>
            -->

            <p style="font-size: 14px; color: #666;">If you need to make any urgent changes, please reply to this email or use the chat feature in the portal.</p>
          </div>
          <div class="footer">
            <p><strong>LPO.PLUS</strong> | Premium Logistics Solutions</p>
            <p>Powered by MailPlus Australia</p>
            <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} LPO.PLUS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Success] Confirmation sent to ${customerEmail}. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send confirmation to ${customerEmail}:`, error);
    // Log more details if it's an auth error
    if (error instanceof Error && error.message.includes('Invalid login')) {
      console.error("CRITICAL: Gmail SMTP Authentication failed. Please verify the GMAIL_APP_PASSWORD secret.");
    }
  }
});

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
    const docsToUpdate: admin.firestore.QueryDocumentSnapshot[] = [];

    // 1. Match by NetSuite ID
    if (netsuiteId) {
      const snap = await requestsRef
        .where("netsuiteCustomerId", "==", netsuiteId)
        .where("status", "==", "awaiting-activation")
        .get();
      snap.docs.forEach((d) => docsToUpdate.push(d as admin.firestore.QueryDocumentSnapshot));
    }

    // 2. Match by Company Name
    if (companyName) {
      const snap = await requestsRef
        .where("customer.company", "==", companyName)
        .where("status", "==", "awaiting-activation")
        .get();
      snap.docs.forEach((d) => {
        if (!docsToUpdate.find((existing) => existing.id === d.id)) {
          docsToUpdate.push(d as admin.firestore.QueryDocumentSnapshot);
        }
      });
    }

    // 3. Match by Email (Fallback)
    const email = newData.email || newData.companyEmail;
    if (email) {
      const snap = await requestsRef
        .where("customer.email", "==", email)
        .where("status", "==", "awaiting-activation")
        .get();
      snap.docs.forEach((d) => {
        if (!docsToUpdate.find((existing) => existing.id === d.id)) {
          docsToUpdate.push(d as admin.firestore.QueryDocumentSnapshot);
        }
      });
    }

    if (docsToUpdate.length === 0) {
      console.log(`No queued requests found for customer: ${companyName} (${netsuiteId})`);
      return;
    }

    console.log(`Activating ${docsToUpdate.length} requests for ${companyName}`);
    const batch = firestore.batch();
    docsToUpdate.forEach((doc) => {
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

// Logic: sendEmailFromNetSuite (NetSuite API)
export const sendEmailFromNetSuite = onRequest({
  secrets: [gmailAppPassword, netsuiteApiKey],
  cors: true, // Allow cross-origin requests from NetSuite
}, async (req, res) => {
  // 1. Security Check
  const providedKey = req.headers['x-api-key'] || req.query.api_key;
  if (!providedKey || providedKey !== netsuiteApiKey.value()) {
    console.warn("Unauthorized attempt to call NetSuite Email API");
    res.status(401).send({ success: false, message: "Unauthorized. Please provide a valid X-API-KEY." });
    return;
  }

  // 2. Parse and Validate Body
  const { to, cc, subject, html } = req.body;

  if (!to || !subject || !html) {
    res.status(400).send({ success: false, message: "Missing required fields: to, subject, or html." });
    return;
  }

  console.log(`NetSuite API: Sending email to ${to} with subject: ${subject}`);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "bookings@lpo.plus",
      pass: gmailAppPassword.value(),
    },
  });

  const mailOptions = {
    from: '"LPO.PLUS" <bookings@lpo.plus>',
    to: Array.isArray(to) ? to.join(',') : to,
    cc: cc ? (Array.isArray(cc) ? cc.join(',') : cc) : undefined,
    subject: subject,
    html: html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("NetSuite Email sent:", info.messageId);
    res.status(200).send({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Error sending NetSuite email:", error);
    res.status(500).send({ success: false, message: error.message });
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
  schedule: "5 5 * * *", // 5:05 AM every day
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

  // Log parts as a string to see the internal structure in logs
  console.log("Time parts:", JSON.stringify(parts));

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

  // Log the final calculated date and day name
  console.log(`Target Date: ${todayStr}, Day Name: ${todayDayName}`);

  const scheduledJobsRef = db.collection('scheduled_jobs');
  const jobsRef = db.collection('jobs');

  const snapshot = await scheduledJobsRef.where('status', 'in', ['accepted', 'scheduled']).get();
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
          status: 'scheduled',
          syncedWithNetSuite: false,
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
