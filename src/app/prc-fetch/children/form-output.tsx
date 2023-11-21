import { fetcher } from "../fetcher";
import { sleep } from "../sleep";

export default async function FormOutput() {
  await sleep(1500);
  const user = await fetch(`${process.env.BASE_URL}/api/get/user`, {
    next: { tags: ["user"] },
  }).then((res) => res.json());
  return (
    <>
      <div>Hello {user.name}!</div>
    </>
  );
}
