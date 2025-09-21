export const getClientName = (client, placeholder = "Unnamed Business") => {
  return client?.businessName || placeholder;
};