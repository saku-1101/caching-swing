import { Suspense } from "react";
import Buttons from "./children/buttons";
import Content from "./children/content";
import FormOutput from "./children/form-output";
import Header from "./children/header";
import { Person } from "./children/user";

export default async function RSCFetchPage() {
  return (
    <div>
      <Suspense fallback={<p>⏳loading...</p>}>
        <Header />
      </Suspense>
      <Suspense fallback={<p>⏳loading...</p>}>
        <Content />
      </Suspense>
      <Suspense fallback={<p>⏳loading...</p>}>
        <FormOutput />
      </Suspense>
      <Person />
      <Buttons />
    </div>
  );
}
