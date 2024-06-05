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
import { ActionFunctionArgs, redirect } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { createDiscountGroup, filterProducts } from '~/services/discountgroups.service';
import ProductIndexTable from '~/components/ProductIndexTable';

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

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.json();
    if (formData.formType === 'PRODUCT_FETCH') {
      const filteredProducts = await filterProducts(formData.payload, session.shop);
      return { status: true, data: filteredProducts };
    }

    if (formData.formType === 'DISCOUNT_CREATE') {
      const updatedProducts = await createDiscountGroup(session.shop, formData.payload);
      console.log(updatedProducts, 'updated products');
      return { status: true, data: updatedProducts };
    }
  } catch (error) {
    console.log(error);
    return { status: false, error: JSON.stringify(error) };
  }
};

export default function DiscountgroupsPageCreate() {
  const productFetcher = useFetcher<FilterQueryResponse>();
  const discountGroupCreate = useFetcher<typeof action>();
  const [selected, setSelected] = useState('today');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [discountCriteria, setDiscountCriterias] = useState<ConditionRow[]>([]);

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
    console.log(discountGroupForm.isValid, 'form validity');
  }, [discountGroupForm.isValid]);

  useEffect(() => {
    console.log(discountGroupCreate.data?.status);
   //  if (discountGroupCreate.data?.status) {
   //    redirect('/app/discount-groups');
   //  }
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
      title="New Discount Group"
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
                      label="Handle Name"
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
                />
              </BlockStack>
            </Card>
            <ProductIndexTable
              products={productFetcher.data?.data}
              loading={productFetcher.state != 'idle'}
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

// function ProductIndexTable({ products }) {
//   const resourceName = {
//     singular: 'product',
//     plural: 'products',
//   };

//   const rowMarkup = products.map((product, index) => (
//     <IndexTable.Row id={product.id} key={product.id}>
//       <IndexTable.Cell>
//         <Text variant="bodyMd" fontWeight="bold" as="span">
//           {product.title}
//         </Text>
//       </IndexTable.Cell>
//       <IndexTable.Cell>
//         {product.featuredImage ? (
//           <img
//             src={product.featuredImage.url}
//             alt={product.title}
//             style={{
//               maxWidth: '40px',
//               borderRadius: '4px',
//               aspectRatio: '1/1',
//               objectFit: 'cover',
//             }}
//           />
//         ) : (
//           'No Image'
//         )}
//       </IndexTable.Cell>
//     </IndexTable.Row>
//   ));

//   return (
//     <IndexTable
//       resourceName={resourceName}
//       itemCount={products.length}
//       headings={[{ title: 'Title' }, { title: 'Featured Image' }]}
//     >
//       {rowMarkup}
//     </IndexTable>
//   );
// }
