import { useEffect, useState } from "react"
import { Html5Qrcode } from "html5-qrcode";


export const useScanner = (setBarCode) => {
    const [myScanner, setMyScanner] = useState(null)
    useEffect(() => {
        const html5QrCode = new Html5Qrcode("scanner");
        const config = { fps: 60, qrbox: { width: 300, height: 150 } };
        function onScanSuccess(decodedText, decodedResult) {
          // Handle on success condition with the decoded text or result.
          setBarCode(decodedText);
          html5QrCode.pause(true)
          setMyScanner(html5QrCode)
          console.log(`Scan result: ${decodedText}`, decodedResult);
        }

        function onScanError(errorMessage) {
          // console.log("Scan error")
    
          // handle on error condition, with error message
        }
    
        
    
        // Get back camera for front set facing mode to "user"
        html5QrCode.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanError
        );
        setMyScanner(html5QrCode)
      }, []);

    return {myScanner}
}

export const errorHandler = (err, error, setError) => {
  if (err.response.data.message === undefined) {
    setError({...error, ["errorMessage"]: "404 Error not found"})

  } else {
    setError({...error, ["errorMessage"]: err.response.data.message})
  }
}

export const fakeAwait = (x) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(x);
    }, 2000);
  });
};