import { FieldPath } from 'firebase-admin/firestore';
import type { Firestore, CollectionReference } from 'firebase-admin/firestore';

export async function firestoreBatched(
  firestore: Firestore,
  documentsSnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
  action: 'update',
  update:
    | Record<string, any>
    | ((
        doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => Record<string, any>)
): Promise<any>;
export async function firestoreBatched(
  firestore: Firestore,
  documentsSnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
  action: 'delete'
): Promise<any>;

/**
 * @usage batchWrapper(await firestore.collection('users').get(), 'delete')
 * @usage batchWrapper(await firestore.collection('users').get(), 'update', doc => ({ ...doc.data(), age: doc.data().age + 1 }))
 *
 */
export async function firestoreBatched(
  firestore: Firestore,
  documentsSnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>,
  action: 'delete' | 'update' | 'set',
  update?:
    | Record<string, any>
    | ((
        doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => Record<string, any>)
) {
  const writeBatches: FirebaseFirestore.WriteBatch[] = [
    // initialize with firest batch
    firestore.batch(),
  ];

  let operationCounter = 0;
  let batchIndex = 0;

  documentsSnapshot.forEach((doc) => {
    if (action === 'delete') {
      writeBatches[batchIndex].delete(doc.ref);
    } else if (action === 'update') {
      const updatedValue = typeof update === 'function' ? update(doc) : update;
      writeBatches[batchIndex].update(doc.ref, updatedValue);
    } else if (action === 'set') {
      const updatedValue = typeof update === 'function' ? update(doc) : update;
      writeBatches[batchIndex].set(doc.ref, updatedValue);
    }

    operationCounter++;

    /** https://cloud.google.com/firestore/quotas#writes_and_transactions */
    // Max batch size is 500
    if (operationCounter === 499) {
      writeBatches.push(firestore.batch());
      batchIndex++;
      operationCounter = 0;
    }
  });

  // commit all batches
  await Promise.all(writeBatches.map((batch) => batch.commit()));

  return;
}

export async function deleteDocumentsByIds(
  firestore: Firestore,
  collectionRef: CollectionReference,
  ids: string[]
) {
  // Split the IDs into chunks of 500
  const chunkedIds = chunkify(ids, 499);
  const writeBatches = chunkedIds.map((ids) => {
    const batch = firestore.batch();
    ids.forEach((id) => {
      batch.delete(collectionRef.doc(id));
    });
    return batch.commit();
  });
  await Promise.all(writeBatches);

  return true;
}

function chunkify<T>(list: T[], size: number): T[][] {
  const listLen = list.length;
  const maxChunks = Math.ceil(listLen / size);
  const chunks: T[][] = new Array(maxChunks);

  for (let i = 0; i < listLen; i += size) {
    chunks[i] = list.slice(i, i + size);
  }

  return chunks;
}
