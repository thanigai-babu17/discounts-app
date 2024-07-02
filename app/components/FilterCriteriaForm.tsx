import {
  BlockStack,
  Button,
  InlineGrid,
  InlineStack,
  Select,
  TextField,
  Text,
  Form,
  Box,
} from '@shopify/polaris';
import { FormikErrors, FormikTouched, useFormik } from 'formik';
import { XCircleIcon } from '@shopify/polaris-icons';
import * as yup from 'yup';
import { ConditionRow, FormValues } from '~/common/types';
import { useEffect } from 'react';

const propertyNameOptions = [
  { label: 'Collection', value: 'collections' },
  { label: 'Product Type', value: 'product_type' },
  { label: 'Product Tag', value: 'tags' },
  { label: 'Product Name', value: 'product_title' },
  { label: 'Variant Name', value: 'variant_title' },
  { label: 'price', value: 'price' },
];

const propertyOperatorsMap = {
  collections: [
    { label: 'contains', value: 'like' },
    { label: 'starts with', value: 'starts-with' },
    { label: 'ends with', value: 'ends-with' },
    // { label: 'has', value: 'in' },
    // { label: 'has not', value: 'not-in' },
  ],
  product_type: [
    { label: 'is equal to', value: '=' },
    { label: 'not equal to', value: '!=' },
    { label: 'starts with', value: '>=' },
    { label: 'ends with', value: '<' },
  ],
  tags: [
    { label: 'contains', value: 'like' },
    { label: 'starts with', value: 'starts-with' },
    { label: 'ends with', value: 'ends-with' },
  ],
  price: [
    { label: 'is equal to', value: '=' },
    { label: 'not equal to', value: '!=' },
    { label: 'greater than', value: '>' },
    { label: 'greater than or equal to', value: '>=' },
    { label: 'less than', value: '<' },
    { label: 'less than or equal to', value: '<=' },
  ],
  product_title: [
    { label: 'is equal to', value: '=' },
    { label: 'not equal to', value: '!=' },
    { label: 'contains', value: 'like' },
    { label: 'starts with', value: 'starts-with' },
    { label: 'ends with', value: 'ends-with' },
  ],
  variant_title: [
    { label: 'is equal to', value: '=' },
    { label: 'not equal to', value: '!=' },
    { label: 'contains', value: 'like' },
    { label: 'starts with', value: 'starts-with' },
    { label: 'ends with', value: 'ends-with' },
  ],
};

type ComponentProps = {
  filterOnSubmit: (formData: ConditionRow[]) => void;
  conditions?: ConditionRow[];
  loading: boolean;
};

export default function FilterCriteriaForm({
  filterOnSubmit,
  loading,
  conditions,
}: ComponentProps) {
  const filterCriteriaForm = useFormik({
    initialValues: {
      conditionSet: [
        {
          property_name: propertyNameOptions[0].value,
          operator:
            propertyOperatorsMap[
              propertyNameOptions[0].value as keyof typeof propertyOperatorsMap
            ][0].value,
          property_value: '',
        },
      ] as ConditionRow[],
    },
    validationSchema: yup.object({
      conditionSet: yup.array().of(
        yup.object({
          property_name: yup.string().required('Property is required'),
          operator: yup.string().required('Operator is required'),
          property_value: yup.string().required('Value is required'),
        })
      ),
    }),
    onSubmit: async (values) => {
      filterOnSubmit(values.conditionSet);
    },
  });

  useEffect(() => {
    if (conditions) {
      filterCriteriaForm.setValues({
        conditionSet: conditions,
      });
    }
  }, []);

  function handleFieldChange(index: number, field: keyof ConditionRow, value: string) {
    const rows = [...filterCriteriaForm.values.conditionSet];
    rows[index][field] = value;
    if (field === 'property_name') {
      rows[index].operator =
        propertyOperatorsMap[value as keyof typeof propertyOperatorsMap][0].value;
      rows[index].property_value = '';
    }
    filterCriteriaForm.setFieldValue('conditionSet', rows);
  }

  function removeConditionRow(index: number): void {
    if (filterCriteriaForm.values.conditionSet.length > 1) {
      const rows = [...filterCriteriaForm.values.conditionSet];
      rows.splice(index, 1);
      filterCriteriaForm.setFieldValue('conditionSet', rows);
    }
  }

  function addConditionRow(): void {
    const rows = [...filterCriteriaForm.values.conditionSet];
    rows.push({
      property_name: rows[rows.length - 1].property_name,
      property_value: '',
      operator: rows[rows.length - 1].operator,
    });
    filterCriteriaForm.setFieldValue('conditionSet', rows);
  }

  function getFieldError(
    errors: FormikErrors<FormValues>,
    touched: FormikTouched<FormValues>,
    index: number,
    field: keyof ConditionRow
  ): string | undefined {
    const conditionErrors = errors.conditionSet as FormikErrors<ConditionRow>[] | undefined;
    const conditionTouched = touched.conditionSet as FormikTouched<ConditionRow>[] | undefined;

    if (conditionErrors && conditionTouched && conditionErrors[index] && conditionTouched[index]) {
      const fieldError = conditionErrors[index][field];
      const fieldTouched = conditionTouched[index][field];
      if (fieldTouched && typeof fieldError === 'string') {
        return fieldError;
      }
    }
    return undefined;
  }

  return (
    <BlockStack gap={'100'}>
      <Text as="h3">Conditions:</Text>
      <Form onSubmit={filterCriteriaForm.handleSubmit}>
        <BlockStack gap={'400'}>
          {filterCriteriaForm.values.conditionSet.length > 0 &&
            filterCriteriaForm.values.conditionSet.map((row, index) => (
              <InlineGrid
                key={`${index}_condition_row`}
                gap={'400'}
                columns={['oneThird', 'oneThird', 'oneThird']}
              >
                <Select
                  label="Property"
                  labelHidden
                  options={propertyNameOptions}
                  onChange={(value) => handleFieldChange(index, 'property_name', value)}
                  value={row.property_name}
                  error={getFieldError(
                    filterCriteriaForm.errors,
                    filterCriteriaForm.touched,
                    index,
                    'property_name'
                  )}
                />
                <Select
                  label="Operator"
                  labelHidden
                  options={
                    propertyOperatorsMap[row.property_name as keyof typeof propertyOperatorsMap]
                  }
                  onChange={(value) => handleFieldChange(index, 'operator', value)}
                  value={row.operator}
                  error={getFieldError(
                    filterCriteriaForm.errors,
                    filterCriteriaForm.touched,
                    index,
                    'operator'
                  )}
                />
                <InlineStack gap={'400'} wrap={false}>
                  <TextField
                    label="Value"
                    labelHidden
                    value={row.property_value}
                    autoComplete="off"
                    onChange={(value) => handleFieldChange(index, 'property_value', value)}
                    error={getFieldError(
                      filterCriteriaForm.errors,
                      filterCriteriaForm.touched,
                      index,
                      'property_value'
                    )}
                  />
                  {filterCriteriaForm.values.conditionSet.length > 1 && (
                    <Box as={'div'}>
                      <Button
                        icon={XCircleIcon}
                        onClick={() => removeConditionRow(index)}
                        tone={'critical'}
                        accessibilityLabel={'Add theme'}
                      />
                    </Box>
                  )}
                </InlineStack>
              </InlineGrid>
            ))}
          <InlineStack gap="200">
            <Button variant={'primary'} loading={loading} submit>
              Filter
            </Button>
            <Button onClick={() => addConditionRow()}>Add another condition</Button>
          </InlineStack>
        </BlockStack>
      </Form>
    </BlockStack>
  );
}
