type ContentProps = {
  data: {
    subscribers_count: number;
    stargazers_count: number;
    forks_count: number;
  };
  randomNumber: number | undefined;
};
export default function Content({ data, randomNumber }: ContentProps) {
  if (!randomNumber) {
    return <div>randomNumber is not defined</div>;
  }
  return (
    <p style={{ padding: "2%" }}>
      <strong>👁Subscribers: {data.subscribers_count}</strong>{" "}
      <strong>✨Stars: {data.stargazers_count}</strong>{" "}
      <strong>🍴Forks: {data.forks_count}</strong>
      <strong>🔢Random Number: {randomNumber}</strong>
    </p>
  );
}
