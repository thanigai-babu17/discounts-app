import { Session } from '@shopify/shopify-api';
import { SessionStorage } from '@shopify/shopify-app-session-storage';
import type { Firestore, CollectionReference } from 'firebase-admin/firestore';
import * as fsUtils from './utils';

type FirestoreSessionStorageOptions = {
  firestore: Firestore;
  collection?: string;
};

export class FirestoreSessionStorage implements SessionStorage {
  private firestore: Firestore;
  private colName: string;
  private collection: CollectionReference;

  constructor({ firestore, collection = 'shopify_sessions' }: FirestoreSessionStorageOptions) {
    this.firestore = firestore;
    this.colName = collection;
    this.collection = this.firestore.collection(this.colName);
  }

  public async storeSession(session: Session): Promise<boolean> {
    await this.collection.doc(session.id).set(session.toObject(), { merge: true });
    return true;
  }

  public async loadSession(id: string): Promise<Session | undefined> {
    const docRef = await this.collection.doc(id).get();
    if (!docRef.exists) {
      return undefined;
    }

    const data = docRef.data() as any;
    return data ? new Session(data) : undefined;
  }

  public async deleteSession(id: string): Promise<boolean> {
    // await this.collection.deleteOne({ id });
    await this.collection.doc(id).delete();
    return true;
  }

  public async deleteSessions(ids: string[]): Promise<boolean> {
    await fsUtils.deleteDocumentsByIds(this.firestore, this.collection, ids);
    return true;
  }

  public async findSessionsByShop(shop: string): Promise<Session[]> {
    const snap = await this.collection.where('shop', '==', shop).get();

    // remove any non-existing docs
    const deleteBatches: FirebaseFirestore.WriteBatch[] = [this.firestore.batch()];
    let deleteBatchIndex = 0;
    let batchOpsCount = 0;

    const sessionsList = snap.docs.reduce<Session[]>((list, doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data) {
          list.push(new Session(data as any));
        } else {
          if (!deleteBatches[deleteBatchIndex]) {
            deleteBatches[deleteBatchIndex] = this.firestore.batch();
          }

          deleteBatches[deleteBatchIndex].delete(doc.ref);
          batchOpsCount++;

          if (batchOpsCount >= 499) {
            deleteBatchIndex++;
            batchOpsCount = 0;
          }
        }
      }
      return list;
    }, []);

    if (deleteBatches.length) {
      await Promise.all(deleteBatches.map((batch) => batch.commit()));
    }

    return sessionsList;
  }
}
