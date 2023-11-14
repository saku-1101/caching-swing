"use client";
import BackButton from "../_component/back-button";
import LinkButton from "../_component/link-button";
/*
  swrを使用してデータを取得することで、
  親コンポーネントの責務はレンダリングのみとなり、
  データは子コンポーネントに直接接続される形となるため、
  子コンポーネントは独立してデータを取得できるようになる

  さらに、同じSWR キーを使用してリクエストは自動的に重複排除、キャッシュ、共有されるため
  リクエストは1回だけしか実行されない！

  また、ユーザーのフォーカスやネットワークの再接続時に、アプリケーションがデータを再取得できるようになりました！ 
  つまり、ユーザーのノート PC がスリープから復帰した時や、ブラウザのタブを切り替えた時に、自動的にデータが更新される
*/
import Content from "./children/content";
import Header from "./children/header";
import { Person } from "./children/user";

export default function SWRPage() {
	return (
		<div>
			<Header />
			<Content />
			<Person />
			<BackButton />
			<LinkButton link="/prc-tanstack" label="tanstack" />
			<LinkButton link="/prc-fetch" label="fetch" />
		</div>
	);
}
