import { User } from "@prisma/client";

type HeaderProps = {
  data: {
    name: string;
    description: string;
  };
  randomNumber: number | undefined;
  user: User | undefined;
};
export default function Header({ data, randomNumber, user }: HeaderProps) {
  if (!randomNumber || !user) {
    return <div>value is not defined</div>;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "2%",
        border: "1px solid #ccc",
      }}
    >
      <h1 className="text-3xl font-extrabold">{data.name}</h1>
      <p>{data.description}</p>
      <strong>🔢Random Number: {randomNumber}</strong>
      <strong>🌟User: {user.name}</strong>
    </div>
  );
}
