/**
 * Get client form field configuration
 * @param {Array} wholesalers - Array of wholesaler objects with name property
 * @returns {Array} Form field configuration for client forms
 */
export const getClientFormFields = (wholesalers = []) => [
  {
    name: 'businessName',
    label: 'Business Name',
    type: 'text',
    required: true
  },
  {
    name: 'stateLicenseNumber',
    label: 'State License Number',
    type: 'text',
    required: false
  },
  {
    name: 'wholesaler',
    label: 'Wholesaler',
    type: 'select',
    required: false,
    placeholder: 'Select a wholesaler',
    options: wholesalers.map(w => ({ value: w.name, label: w.name }))
  },
  {
    name: 'accountNumber',
    label: 'Account Number',
    type: 'text',
    required: false
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
