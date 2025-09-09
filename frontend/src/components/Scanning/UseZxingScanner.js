import { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";

export function useZxingScanner(videoElementId, onScan) {
  const [control, setControl] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const readerRef = useRef(null);

  useEffect(() => {
    const videoEl = document.getElementById(videoElementId);
    if (!videoEl) {
      setError(`Video element #${videoElementId} not found`);
      return;
    }

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // Prefer formats used for NDC labels
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.DATA_MATRIX,   // GS1 DataMatrix (common for NDC)
      BarcodeFormat.CODE_128,      // GS1-128 (linear)
      BarcodeFormat.RSS_EXPANDED,  // GS1 DataBar Expanded
      BarcodeFormat.RSS_14,        // GS1 DataBar
      BarcodeFormat.EAN_13,
      BarcodeFormat.UPC_A,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    // Use constraints, not deviceId
    const constraints = {
      audio: false,
      video: {
        facingMode: "environment", // best-effort back camera
        width: { ideal: 1280 },
        height: { ideal: 720 },
        // You can add advanced constraints if needed for iOS/Android
      },
    };

    reader
      .decodeFromConstraints(
        constraints,
        videoEl,
        (result, err) => {
          if (result) {
            onScan(result.getText(), result);
          }
          // err fires frequently while searching; don't spam logs
        },
        hints
      )
      .then((ctrl) => {
        setControl(ctrl);
        setIsRunning(true);
      })
      .catch((e) => {
        setError(e?.message || "Unable to start camera.");
        setIsRunning(false);
      });

    return () => {
      setIsRunning(false);
      setError(null);
      try { control?.stop?.(); } catch {}
      try { reader.reset(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoElementId]);

  return { control, isRunning, error };
}
