import { ConditionRow, Product } from '~/common/types';
import db from '../db.server';
import { CollectionReference, DocumentData, WhereFilterOp } from 'firebase-admin/firestore';

export async function filterProducts(
  criteria: ConditionRow[],
  shop: string
): Promise<Product[] | Error> {
  try {
    let queryRef = db
      .collection(`${shop}_products`)
      .where('status', '==', 'ACTIVE')
      .where('discount_group', '==', null);

    criteria.forEach((c) => {
      queryRef = queryRef.where(c.property_name, c.operator as WhereFilterOp, c.property_value);
    });

    const queryResults = await queryRef.get();
    const queryData: Product[] = queryResults.docs.map((q) => {
      const qData = q.data();
      return {
        id: q.id,
        main_product_id: qData.main_product_id,
        status: qData.status,
        variant_title: qData.variant_title,
        display_name: qData.display_name,
        variant_img: qData.variant_img,
        product_img: qData.product_img,
        tags: qData.tags,
        product_title: qData.product_title,
        product_type: qData.product_type,
        price: qData.price,
        availability: qData.availability,
        collections: qData.collections,
        sku: qData.sku,
        discount_group: qData.discount_group,
      } as Product;
    });

    return queryData;
  } catch (error: any) {
    throw error;
  }
}

export async function createDiscountGroup(shop: string, payload: any) {
  try {
    const docRef = db.collection(`${shop}_discountgroups`).doc();
    await docRef.set({ status: 'ACTIVE', ...payload.discount_group });
    const batch = db.batch();
    payload.selected_products.forEach((id: any) => {
      const productRef = db.collection(`${shop}_products`).doc(id);
      batch.update(productRef, { discount_group: docRef.id });
    });
    await batch.commit();
    const updatedProducts: any[] = [];
    for (const productId of payload.selected_products) {
      const productRef = db.collection(`${shop}_products`).doc(productId);
      const productDoc = await productRef.get();
      if (productDoc.exists) {
        updatedProducts.push(productDoc.data());
      }
    }
    return updatedProducts;
  } catch (error) {
    throw error;
  }
}
