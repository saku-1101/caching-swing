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
import FormOutput from "./children/form-output";
import Header from "./children/header";
import { Person } from "./children/user";

export default async function LegacyFetchPage() {
	return (
		<div>
			<Header />
			<Content />
			<FormOutput />
			<Person />
			<Buttons />
		</div>
	);
}
