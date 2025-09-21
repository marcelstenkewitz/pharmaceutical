const ClientName = ({ client, placeholder = "Unnamed Business" }) => {
  return <>{client?.businessName || placeholder}</>;
};

export default ClientName;