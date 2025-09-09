import React, { useEffect, useState } from "react";
import { Button, Stack } from "react-bootstrap";
import { addFacultyId, checkFacultyId, validateAssetID, validateStudentID, checkOut, checkIn } from "../Api/api";
import { useGetLoans } from "../components/Admin/adminHelpers";

const Test = () => {
  const [error, setError] = useState({
    errorMessage: null,
  })
  // All gets from api
    const data = useGetLoans();
     
    const errorHandler = (err) => {
      setError({...error, ["errorMessage"]: err.response.data.message})
    }

// Faculty
  const addFacultyMember = async () => {
    const response = await addFacultyId("D41220815").catch(err => errorHandler(err));;
    
    if (response) {
      console.log(response);
      return setError({...error, ["errorMessage"]: null})
    }
    
  };


  
  const validateFacultyMember = async () => {
    const response = await checkFacultyId("23").catch(err => errorHandler(err));
    if (response) {
      console.log(response);
      return setError({...error, ["errorMessage"]: null})
    }
    
  };
  
  
  //Loans
  const checkAssetID = async () => {
    const response = await validateAssetID("23").catch(err => errorHandler(err));
    if (response) {
      console.log(response);
      return setError({...error, ["errorMessage"]: null})
    }
  };

  const checkStudentID = async () => {
    const response = await validateStudentID("D41208152").catch(err => errorHandler(err));;
    if (response) {
      console.log(response);
      return setError({...error, ["errorMessage"]: null})
    }
  };
  
  const newLoan = {
    facultyID: "27",
    studentID: "D41208152",
    assetID: "D41220815"
  }
  
  const handleCheckOut = async () => {
    const response = await checkOut(newLoan).catch(err => errorHandler(err));
    if (response) {
      console.log(response);
      return setError({...error, ["errorMessage"]: null})
    }
  }
  
  const handleCheckIn = async () => {
    const response = await checkIn(newLoan.assetID).catch(err => errorHandler(err));
    if (response) {
      console.log(response);
      return setError({...error, ["errorMessage"]: null})
    }
  }
  
  useEffect(() => {
    console.log(data);
  }, [data]);

  useEffect(() => {
    console.log("My error is: ")
    console.log(error)
  
  }, [error])
  
  return (
    <Stack gap={3}>
      <h1>Faculty test</h1>
      <Button onClick={addFacultyMember}>Add faculty member</Button>
      <Button onClick={validateFacultyMember}>Validate faculty member</Button>
      <br />
      <h1>Loans test</h1>
      <Button onClick={checkAssetID}>Validate asset id</Button>
      <Button onClick={checkStudentID}>Validate student id</Button>
      <Button onClick={handleCheckOut}>Check out</Button>
      <Button onClick={handleCheckIn}>Check in</Button>
      <h1>Current error message: <span className="text-danger">{error.errorMessage}</span></h1>
    </Stack>
  );
};

export default Test;
