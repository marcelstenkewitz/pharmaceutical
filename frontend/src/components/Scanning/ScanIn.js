import React, { useState, useEffect, useCallback } from "react";
import { checkIn } from "../../Api/api";
import { useScanner, fakeAwait, errorHandler } from "./ScanningHelper";
import "./scanning.css";
import { Alert } from "react-bootstrap";
import Wrapper from "../Layout/Wrapper";

const ScanIn = ({ barcode, setBarcode, error, setError, setScanning }) => {
  const { myScanner } = useScanner(setBarcode);
  const [hideScanner, setHideScanner] = useState(false);
  const toggleScanner = useCallback(() => {
    setHideScanner(!hideScanner);
  }, [hideScanner]);
  const processCheckIn = useCallback(async () => {
    toggleScanner();
    const response = await checkIn(barcode).catch((err) => errorHandler(err));
    if (response === undefined) {
      await fakeAwait();
      toggleScanner();
      myScanner.resume();
    }
    if (response) {
      console.log(response);
      setBarcode(null);
      setError({ ...error, errorMessage: null });
      await fakeAwait();
      setScanning("scanningInSuccess");
    }
  }, [barcode, myScanner, error, setBarcode, setError, setScanning, toggleScanner]);

  useEffect(() => {
    if (barcode !== null) processCheckIn();
  }, [barcode, processCheckIn]);

  return (
    <>
      <Wrapper>
        <h1>CHECKING IN</h1>
        <h3>Please scan asset ID</h3>
        <div id="scanner"></div>
        <Alert variant="dark" className="text-center">
          <Alert.Heading>Barcode</Alert.Heading>
          <p>{barcode}</p>
        </Alert>
      </Wrapper>
    </>
  );
};

export default ScanIn;
