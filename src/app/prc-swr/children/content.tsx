import { useGetNumber } from "../hooks/useGetNumber";
import { useGithub } from "../hooks/useGithub";

export default function Content() {
  const {
    data: githubData,
    error: githubError,
    isLoading: githubIsLoading,
    isValidating: githubIsValidating,
  } = useGithub();
  const {
    data: numberData,
    error: numberError,
    isLoading: numberIsLoading,
    isValidating: numberIsValidating,
  } = useGetNumber();

  if (githubIsLoading || numberIsLoading) {
    return <div>⏳Initial loading...</div>;
  } else if (githubIsValidating || numberIsValidating) {
    return <div>⏳loading...</div>;
  } else if (githubError || numberError) {
    return <div>failed to load</div>;
  }
  return (
    <p style={{ padding: "2%" }}>
      <strong>👁Subscribers: {githubData.subscribers_count}</strong>{" "}
      <strong>✨Stars: {githubData.stargazers_count}</strong>{" "}
      <strong>🍴Forks: {githubData.forks_count}</strong>{" "}
      <strong>🔢Random Number: {numberData.randomNumber}</strong>
    </p>
  );
}
