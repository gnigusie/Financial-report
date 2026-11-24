import { useCallback, useEffect, useState } from "react";

export function useFeedback() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (!error && !success) return;
    const id = setTimeout(() => (setError(""), setSuccess("")), 3000);
    return () => clearTimeout(id);
  }, [error, success]);
  const clearFeedback = useCallback(() => (setError(""), setSuccess("")), []);
  return { error, setError, success, setSuccess, clearFeedback };
}
