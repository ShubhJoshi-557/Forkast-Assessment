import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  // 1. Initialize state with the default value ALWAYS.
  // This ensures the server render and initial client render are identical.
  const [state, setState] = useState<T>(defaultValue);

  // 2. On the client, after the first render, check localStorage.
  // This useEffect runs only once on the client side.
  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue) {
        setState(JSON.parse(storedValue));
      }
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
    }
  }, [key]);

  // 3. This useEffect saves any subsequent state changes back to localStorage.
  // It's safe because it also only runs on the client.
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, state]);

  return [state, setState];
}