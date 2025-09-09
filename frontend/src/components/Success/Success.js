import React from "react";
import { CheckCircleFill } from "react-bootstrap-icons";
import Wrapper from "../Layout/Wrapper";
const Success = ({ text }) => {
  return (
    <Wrapper centerText={true}>
      <h1>Laptop Has been checked {text}</h1>
      <CheckCircleFill color="green" size={300} />
    </Wrapper>
  );
};

export default Success;
