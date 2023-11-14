import { useGetNumber } from "../hooks/useGetNumber";
import { useGithub } from "../hooks/useGithub";

export default function Content() {
  const {
    data: githubData,
    error: githubError,
    isFetching: githubIsFetching,
    isPending: githubIsPending,
  } = useGithub();
  const {
    data: numberData,
    error: numberError,
    isFetching: numberIsFetching,
    isPending: numberIsPending,
  } = useGetNumber();

  if (githubIsFetching || numberIsFetching) {
    return <div>⏳loading...</div>;
  } else if (githubIsPending || numberIsPending) {
    return <div>validating...</div>;
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
