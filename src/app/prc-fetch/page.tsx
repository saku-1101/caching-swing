import Buttons from "./children/buttons";
/*
  従来のトップレベルでuseEffectを使用してデータを取得し、
  propsを介して子コンポーネントに渡す方法
  データの依存関係が増えて、コードの保守がしにくくなる

  Contextを使用してもいいが、Contextを持つ親コンポーネントは
  子コンポーネントがどのようなデータを必要としているかを知る必要があり、
  動的なコンテンツの場合は、Contextを使用することは難しい
*/
import Content from "./children/content";
import Header from "./children/header";
import { Person } from "./children/user";
import { fetcher } from "./fetcher";

export default async function LegacyFetchPage() {
	const user = await fetcher({
		url: `${process.env.BASE_URL}/api/get/user`,
		tag: "user",
	});

	return (
		<div>
			<Header />
			<Content />
			<div>Hello {user.name}!</div>
			<Person />
			<Buttons />
		</div>
	);
}
