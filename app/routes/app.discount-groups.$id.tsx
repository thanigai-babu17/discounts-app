import {
  Card,
  Layout,
  Page,
  Select,
  Form,
  FormLayout,
  TextField,
  Button,
  InlineStack,
  InlineGrid,
  BlockStack,
  Text,
  IndexTable,
} from '@shopify/polaris';
import { useCallback, useEffect, useState } from 'react';
import { useFormik } from 'formik';
import { authenticate } from '~/shopify.server';
import * as yup from 'yup';
import FilterCriteriaForm from '~/components/FilterCriteriaForm';
import { ConditionRow, FilterQueryResponse } from '~/common/types';
import { ActionFunctionArgs, LoaderFunctionArgs, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData, useNavigate } from '@remix-run/react';
import {
  createDiscountGroup,
  filterProducts,
  filterProductsForDiscountGrp,
} from '~/services/discountgroups.service';
import ProductIndexTable from '~/components/ProductIndexTable';
import db from '~/db/db.server';
import { tableNamePrefix } from '~/common/utils';

const discountTypeOptions = [
  {
    label: 'Percentage (%)',
    value: 'PERCENTAGE',
  },
  {
    label: 'Fixed Amount ($)',
    value: 'FIXED',
  },
];

const options = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
];

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const discountGroup = await db(tableNamePrefix(`${session.shop}_discountgroups`))
    .select(
      'id',
      'status',
      'handle',
      'sub_discount_type',
      'sub_discount_value',
      'onetime_discount_type',
      'onetime_discount_value',
      'criterias'
    )
    .where('id', params.id);
  const filteredProducts = await filterProductsForDiscountGrp(
    discountGroup[0].criterias,
    session.shop,
    params.id as string
  );
  const selectedProductIds = filteredProducts
    .filter((p) => p.discount_group == params.id)
    .map((p) => p.id);
  return { discountGroup: discountGroup[0], products: filteredProducts, selectedProductIds };
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);

    const formData = await request.json();
    if (formData.formType === 'PRODUCT_FETCH') {
      const filteredProducts = await filterProductsForDiscountGrp(
        formData.payload,
        session.shop,
        params.id as string
      );
      return { data: filteredProducts };
    }

    if (formData.formType === 'DISCOUNT_CREATE') {
      const updatedProducts = await createDiscountGroup(
        session.shop,
        formData.payload,
        session.accessToken
      );
      // console.log(updatedProducts, 'updated products');
      return { data: updatedProducts };
    }
  } catch (error) {
    console.error(error);
    return { data: null };
  }
};

export default function DiscountgroupsPageTemplate() {
  const productFetcher = useFetcher<FilterQueryResponse>();
  const discountGroupCreate = useFetcher<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState('today');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [discountCriteria, setDiscountCriterias] = useState<ConditionRow[]>([]);
  const navigation = useNavigate();
  console.log(loaderData, 'loader data');
  const discountGroupForm = useFormik({
    initialValues: {
      handle: '',
      subDiscountType: 'PERCENTAGE',
      subDiscountVal: '0',
      oneTimeDiscountType: 'PERCENTAGE',
      oneTimeDiscountVal: '0',
    },
    validationSchema: yup.object({
      handle: yup.string().required('Discount group handle is required'),
      subDiscountType: yup.string().required('Value type is required'),
      subDiscountVal: yup.number().min(0).required('Discount value is required'),
      oneTimeDiscountType: yup.string().required('Value type is required'),
      oneTimeDiscountVal: yup.number().min(0).required('Discount value is required'),
    }),
    onSubmit: async (values) => {
      // console.log(discountCriteria, selectedProducts,'diuscount criterias');
      discountGroupCreate.submit(
        {
          formType: 'DISCOUNT_CREATE',
          payload: {
            discount_group: { ...values, criterias: discountCriteria },
            selected_products: selectedProducts,
          },
        },
        {
          method: 'POST',
          encType: 'application/json',
        }
      );
    },
  });

  useEffect(() => {
    discountGroupForm.setValues({
      handle: loaderData.discountGroup.handle,
      subDiscountType: loaderData.discountGroup.sub_discount_type,
      subDiscountVal: loaderData.discountGroup.sub_discount_value,
      oneTimeDiscountType: loaderData.discountGroup.onetime_discount_type,
      oneTimeDiscountVal: loaderData.discountGroup.onetime_discount_value,
    });
    productFetcher.data = { data: loaderData.products };
  }, []);

  useEffect(() => {
    console.log(discountGroupCreate.data, 'discount created!!!!');
    if (discountGroupCreate.data?.data) {
      //navigation('/app/discount-groups');
    }
  }, [discountGroupCreate.data]);

  const handleSelectChange = useCallback((value: string) => setSelected(value), []);

  async function handleFilterOnSubmit(e: ConditionRow[]) {
    setDiscountCriterias(e);
    productFetcher.submit(
      { formType: 'PRODUCT_FETCH', payload: e },
      {
        method: 'POST',
        encType: 'application/json',
      }
    );
  }

  function handleProductSelect(selectedRecords: string[]) {
    setSelectedProducts(selectedRecords);
  }

  return (
    <Page
      backAction={{ url: '/app/discount-groups/' }}
      title="Discount Group"
      compactTitle
      primaryAction={{
        content: 'Save',
        disabled: !selectedProducts.length || !discountCriteria.length,
        onAction: () => discountGroupForm.submitForm(),
        loading: discountGroupCreate.state != 'idle',
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap={'400'}>
            <Card>
              <BlockStack gap={'400'}>
                <Form onSubmit={discountGroupForm.handleSubmit}>
                  <FormLayout>
                    <TextField
                      value={discountGroupForm.values.handle}
                      onChange={(value) => discountGroupForm.setFieldValue('handle', value)}
                      label="Group Name"
                      type="text"
                      requiredIndicator
                      autoComplete="off"
                      error={
                        discountGroupForm.errors.handle && discountGroupForm.touched.handle
                          ? discountGroupForm.errors.handle
                          : ''
                      }
                    />
                    <InlineGrid columns={['oneThird', 'oneThird']} gap={'400'}>
                      <Select
                        label="Subscription Discount Type"
                        options={discountTypeOptions}
                        requiredIndicator
                        onChange={(value) =>
                          discountGroupForm.setFieldValue('subDiscountType', value)
                        }
                        value={discountGroupForm.values.subDiscountType}
                      />
                      <TextField
                        value={discountGroupForm.values.subDiscountVal}
                        onChange={(value) =>
                          discountGroupForm.setFieldValue('subDiscountVal', value)
                        }
                        label="Subscription Discount Value"
                        type="number"
                        requiredIndicator
                        autoComplete="off"
                        error={
                          discountGroupForm.errors.subDiscountVal &&
                          discountGroupForm.touched.subDiscountVal
                            ? discountGroupForm.errors.subDiscountVal
                            : ''
                        }
                      />
                    </InlineGrid>
                    <InlineGrid columns={['oneThird', 'oneThird']} gap={'400'}>
                      <Select
                        label="One-time Discount Type"
                        options={discountTypeOptions}
                        requiredIndicator
                        onChange={(value) =>
                          discountGroupForm.setFieldValue('oneTimeDiscountType', value)
                        }
                        value={discountGroupForm.values.oneTimeDiscountType}
                      />
                      <TextField
                        value={discountGroupForm.values.oneTimeDiscountVal}
                        onChange={(value) =>
                          discountGroupForm.setFieldValue('oneTimeDiscountVal', value)
                        }
                        label="One-time Discount Value"
                        type="text"
                        requiredIndicator
                        autoComplete="off"
                        error={
                          discountGroupForm.errors.oneTimeDiscountVal &&
                          discountGroupForm.touched.oneTimeDiscountVal
                            ? discountGroupForm.errors.oneTimeDiscountVal
                            : ''
                        }
                      />
                    </InlineGrid>
                  </FormLayout>
                </Form>
                <FilterCriteriaForm
                  filterOnSubmit={handleFilterOnSubmit}
                  loading={productFetcher.state != 'idle'}
                  conditions={loaderData.discountGroup.criterias}
                />
              </BlockStack>
            </Card>
            <ProductIndexTable
              products={productFetcher.data?.data}
              loading={productFetcher.state != 'idle'}
              selectedIds={loaderData.selectedProductIds}
              onSelectionChange={handleProductSelect}
            />
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <Select
              label="Status"
              options={options}
              onChange={handleSelectChange}
              value={selected}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
