/**
 * Get client form field configuration
 * @returns {Array} Form field configuration for client forms
 */
export const getClientFormFields = () => [
  {
    name: 'businessName',
    label: 'Business Name',
    type: 'text',
    required: true
  },
  {
    name: 'deaNumber',
    label: 'DEA Number',
    type: 'text',
    required: false
  },
  {
    name: 'deaExpirationDate',
    label: 'DEA Expiration Date',
    type: 'date',
    required: false
  },
  {
    name: 'stateLicenseNumber',
    label: 'State License Number',
    type: 'text',
    required: false
  },
  {
    name: 'stateLicenseExpirationDate',
    label: 'State License Expiration Date',
    type: 'date',
    required: false
  },
  {
    name: 'wholesaler',
    label: 'Wholesaler',
    type: 'text',
    required: false,
    placeholder: 'e.g., McKesson, Cardinal Health, AmerisourceBergen'
  },
  {
    name: 'wholesalerAccountNumber',
    label: 'Wholesaler Account Number',
    type: 'text',
    required: false
  },
  {
    name: 'wholesalerAddress',
    label: 'Wholesaler Address',
    type: 'text',
    required: false,
    placeholder: 'Wholesaler street address, city, state, ZIP'
  },
  {
    name: 'streetAddress',
    label: 'Street Address',
    type: 'text',
    required: true
  },
  {
    name: 'city',
    label: 'City',
    type: 'text',
    required: true
  },
  {
    name: 'state',
    label: 'State',
    type: 'text',
    required: true
  },
  {
    name: 'zipCode',
    label: 'ZIP Code',
    type: 'text',
    required: true
  },
  {
    name: 'phoneNumber',
    label: 'Phone Number',
    type: 'text',
    required: false
  },
  {
    name: 'contactName',
    label: 'Contact Name',
    type: 'text',
    required: false
  },
  {
    name: 'invoicePercentage',
    label: 'Invoice Percentage (%)',
    type: 'number',
    required: false,
    min: 0,
    max: 100,
    step: 0.01
  }
];
