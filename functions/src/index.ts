import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Triggered when a customer's status changes to 'Active'.
 * Automatically activates any queued job requests for that customer.
 */
export const onCustomerActive = functions.firestore
    .document("lpo/{lpoId}/customers/{customerId}")
    .onUpdate(async (change, context) => {
      const newData = change.after.data();
      const oldData = change.before.data();

      // Check if status changed to 'Active'
      if (newData.status === "Active" && oldData.status !== "Active") {
        const netsuiteId = newData.companyId || newData.netsuiteId;
        const companyName = newData.companyName;

        if (!netsuiteId && !companyName) {
          console.log("No ID or name found for customer activation.");
          return;
        }

        const db = admin.firestore();
        const requestsRef = db.collection("requests");

        // Find queued requests for this customer
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

        const batch = db.batch();
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
