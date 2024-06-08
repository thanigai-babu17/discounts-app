export type ConditionRow = {
  property_name: string;
  operator: string;
  property_value: string;
};

export type FormValues = {
  conditionSet: ConditionRow[];
};

export type Product = {
  id: string;
  main_product_id: string;
  status: string;
  variant_title: string;
  display_name: string;
  variant_img: string | null;
  product_img: string | null;
  tags: string[];
  product_title: string;
  product_type: string;
  price: string;
  availability: boolean;
  collections: string[];
  sku: string;
  discount_group: string | null;
};

export type FilterQueryResponse = { status: boolean; data?: Product[] | null; error?: Error };

export type DiscountGroup = {
  id: string;
  criterias: ConditionRow[];
  handle: string;
  oneTimeDiscountType: string;
  oneTimeDiscountVal: string;
  status: string;
  subDiscountType: string;
  subDiscountVal: string;
};

export const APP_LABELS = {
  PERCENTAGE: '%',
  FIXED: '$',
};
