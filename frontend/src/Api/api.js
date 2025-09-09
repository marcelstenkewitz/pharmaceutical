import axios from 'axios';

const urlLoans = 'http://localhost:3001/api/loans';
const urlFaculty = 'http://localhost:3001/api/faculty';
const urlUser = 'http://localhost:3001/api/user';

// Loans api routes
export const fetchLoans = () => axios.get(urlLoans, { withCredentials: true });
export const fetchLoanHistory = () => axios.get(`${urlLoans}/history`, {withCredentials: true});
export const fetchLoanByAssetID = (id) => axios.get(`${urlLoans}/${id}`); 
export const validateAssetID = (id) => axios.get(`${urlLoans}/validate/assetid/${id}`);
export const validateStudentID = (id) => axios.get(`${urlLoans}/validate/studentid/${id}`);
export const checkOut = (newLoan) => axios.post(`${urlLoans}/add`, newLoan);
export const checkIn = (id) => axios.put(`${urlLoans}/${id}`); 

// Faculty api routes

export const featchFacultyIDs = () => axios.get(urlFaculty, { withCredentials: true });
export const checkFacultyId = (id) => axios.get(`${urlFaculty}/validate/${id}` );
export const addFacultyId = (id) => axios.get(`${urlFaculty}/add/${id}`, { withCredentials: true});

// User api routes
export const fetcheUsers = () => axios.get(urlUser);
export const login = (user) => axios.post(`${urlUser}/login`, user, { withCredentials: true }); 
export const logout = () => axios.get(`${urlUser}/logout`, { withCredentials: true });