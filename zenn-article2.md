「Reactのさまざまなデータフェッチ方法を比較して理解して正しく使用する」シリーズの2記事目です。今回は「SWR・TanStack Queryを用いたデータフェッチ」について理解していきます。
1. イントロ+useEffectを用いたデータフェッチ
2. SWR・TanStack Queryを用いたデータフェッチ ← 👀この記事
3. App Routerでのデータフェッチ+まとめ

## Repository
以下は今シリーズで用いたリポジトリです。

🔽クライアントサイドフェッチの調査に用いたリポジトリ：React+Vite（useEffect, SWR・TanStack Query）
https://github.com/saku-1101/caching-swing-csr
🔽サーバーサイドフェッチの調査に用いたリポジトリ：Next.js Pages Router, App Router
https://github.com/saku-1101/caching-swing-pages
https://github.com/saku-1101/caching-swing


## SWRを用いたクライアントサイドフェッチ
SWRを用いてデータのフェッチ・更新を行うときの挙動の確認から始めていきます。

SWRのようなサードパーティ製のデータフェッチライブラリを使うことのメリットとして次の点が挙げられます。
- propsのバケツリレーを起こさずに、コンポーネント各々がオーナーシップを持ってデータを扱える点
- 各コンポーネントでデータフェッチを行うようにしても無駄なネットワークトランザクションが発生しない点
- レスポンスのキャッシュが行える点
- mutateを使用して直感的に更新後の状態をUIに反映できる点
- データ取得中や更新中の状態管理をしやすいのでユーザに細かく正確なフィードバックを送ることができ、UXを高められる点

そのほかにもたくさんのメリットが[SWRのドキュメント](https://swr.vercel.app/ja)で紹介されています。
[SWR](https://swr.vercel.app/ja)

### SWRを用いたデータフェッチの調査方法
それでは早速、SWRを用いてデータフェッチする処理を書いてみましょう。

https://github.com/saku-1101/caching-swing-csr/blob/d5e43f783b74ec29eb3a8410b7e84d45d6e9fdc5/src/prc-swr/index.tsx#L7-L18
前回のuseEffectを使ったデータフェッチに比べて、ここではデータ取得を行っておらず、各コンポーネントも`props`を持っていません。

その代わりに、データ取得のための`hooks`をいくつか追加しました。
https://github.com/saku-1101/caching-swing-csr/tree/main/src/prc-swr/hooks
![/src/prc-swr/hooks](https://storage.googleapis.com/zenn-user-upload/70ee47882896-20231116.png)
*/src/prc-swr/hooks*
これらのhooksをそのデータが必要な各コンポーネントで呼び出してもらうことで、データ取得の責務を各コンポーネントが持つことができ、コンポーネント同士が`props`で密に接合された状態になることを防ぎます。

以下は`useSWR`を使用したデータフェッチのためのカスタムhooksの一例です。
https://github.com/saku-1101/caching-swing-csr/blob/d5e43f783b74ec29eb3a8410b7e84d45d6e9fdc5/src/prc-swr/hooks/useGithub.ts#L4-L12
`error`や`loading`, `validating`(再検証中)などのデータ取得の際に起こる状態を返してくれるので、より細かで正確なフィードバックを行うことができます。

それでは、Personコンポーネントでユーザ名を更新してみましょう。
https://github.com/saku-1101/caching-swing-csr/blob/d5e43f783b74ec29eb3a8410b7e84d45d6e9fdc5/src/prc-swr/children/user.tsx#L5-L20
https://github.com/saku-1101/caching-swing-csr/blob/d5e43f783b74ec29eb3a8410b7e84d45d6e9fdc5/src/prc-swr/hooks/useGetUser.ts#L4-L24
DB更新処理までは前回同様、`POST`リクエストを送信しているだけです。

SWRではデータ更新の際に`mutate`メソッドを使用することで同様のキーを持つリソースに対して再検証を発行 (データを期限切れとしてマークして再フェッチを発行) できます。
ここでは`mutate`メソッドが`useGetUser`内の`useSWR`から発行されたものですので、`/api/get/user`をキーとして持つリソース、つまり`useGetUser`内部で使用している`useSWR`に「そのデータ古いですよー」と伝えて再フェッチを促します。すると、`validation`がトリガーされ、最新のデータがフェッチされてUIに反映されます。

### 結果
先ほどのデータ更新時の再レンダリング範囲注目してみます。すると、以下のように`useGetUser`を使用しているコンポーネントでのみ再レンダリングが発火していることがわかります。
![SWRを使うと限定的な範囲で再レンダリングができる](https://storage.googleapis.com/zenn-user-upload/13334e1f67c6-20231119.gif)
*SWRを使うと限定的な範囲で再レンダリングができる*

また、ほかにもSWRにはデータを最新に保つ仕組みがいくつか備わっています。その一部を見てみましょう。

#### Revalidate on Focus
`window`にフォーカスが当たった場合に自動的に再検証が走り、最新のデータがフェッチされ、再レンダリングされます。
![SWR: Revalidate on Focus](https://storage.googleapis.com/zenn-user-upload/bac2eca6c17e-20231119.gif)
*SWR: Revalidate on Focus*

#### Revalidate on Interval
`window`にフォーカスを当てずとも、ポーリング間隔を指定することで、一定の間隔でデータフェッチの問い合わせを行って再検証を走らせることができます。異なるデバイス間で定期的にデータ同期を行う際に便利です。
```diff:js useGetUser.ts
export const useGetUser = () => {
  const url = "/api/get/user";
  const { mutate, data, error, isLoading, isValidating } = useSWR(
    `${import.meta.env.VITE_API_BASE_URL}${url}`,
    fetcher,
+    {
+       refreshInterval: 5000,
+    }
  );
  return {
    mutate,
    user: data,
    userError: error,
    userIsLoading: isLoading,
    userIsValidating: isValidating,
  };
};

```
![SWR: Revalidate on Interval](https://storage.googleapis.com/zenn-user-upload/0bc943523854-20231119.gif)
*SWR: Revalidate on Interval*

### リクエストの重複
SWRには重複排除の仕組みが備わっています。

この例では、各コンポーネントにデータ取得の責務を結びつけるために、内部で`useSWR`を用いたカスタムhooksをそれぞれの子コンポーネント内で呼び出していました。

これにより、ユーザ情報を必要とするPersonコンポーネントとHeaderコンポーネントそれぞれで`useGetUser` hookをコールすることになるのですが、ネットワークトランザクションが2回起こることにならないのでしょうか？😶

`useSWR`では同じキーを持ち、ほぼ同時期にレンダリングされるコンポーネントに関しては、リクエストは一つにまとめられます。
ここでは
- `/api/user/get` @ Header, Personコンポーネント
- `/api/get/unstale/data` @ Header, Contentコンポーネント
- `https://github.com` @ Header, Contetnコンポーネント

と、6回のAPIコールを実装していました。
![SWRを使うと重複したリクエストは排除される](https://storage.googleapis.com/zenn-user-upload/94e4fe38424e-20231119.png)
*SWRを使うと重複したリクエストは排除される*
しかし、実際は**3回**のネットワークトランザクションしか発生していません。

また、データ更新を行なったときも、更新後にrevalidationしたキーの紐づくデータの再フェッチしか行いません。SWRでは1度取得したレスポンスはクライアントサイドキャッシュに保存され、次に同じリクエストを送る場合はリクエストを送らずにキャッシュからデータが返される使用になっているからです。
>  SWR は、まずキャッシュからデータを返し（stale）、次にフェッチリクエストを送り（revalidate）、最後に最新のデータを持ってくるという戦略です。
https://swr.vercel.app/ja

したがって、上でユーザ名を更新した時に起こるトランザクションは新しいuser`POST`と`GET`の**2回**のみになり、githubやrandomNumberの再フェッチは行われません。
![SWRを使うと再検証されるデータのみ再フェッチされ、あとはキャッシュから返される](https://storage.googleapis.com/zenn-user-upload/6d52610411d8-20231119.png)
*SWRを使うと再検証されるデータのみ再フェッチされ、あとはキャッシュから返される*

この重複排除の仕組みのおかげで、ネットワークトランザクション回数によるパフォーマンスの問題を気にせずにアプリ内でバシバシSWRフックを再利用することができます💪🏻❤️‍🔥

## TanStack Queryを用いたクライアントサイドフェッチ
TanStack QueryもSWRと同様クライアントサイドキャッシュを利用したデータフェッチが行えるライブラリです。
バンドルサイズはSWRの３倍ほどありますが、Query Hooksの戻り値の種類が多かったり、Query Hooksが持っているoptionの数が多かったりとSWRよりも高機能です。

そんなTanStack Queryを用いてデータのフェッチ・更新を行うときの挙動も確認していきます。

[TanStack Query](https://tanstack.com/query/latest)
* Query Hooks：SWR→ [useSWR](https://swr.vercel.app/ja/docs/api), TanStack Query→ [useQuery](https://tanstack.com/query/v4/docs/react/reference/useQuery)
### TanStack Queryを用いたデータフェッチの調査
まずは、初期設定です。
https://github.com/saku-1101/caching-swing-pages/blob/a9de35ee95420a9049d6a768ef4df0f990eca51d/src/pages/prc-tanstack/index.tsx#L9-L27
TanStack Queryは内部的に`useContext`や`useEffect`などを使用しているため、TanStack Queryを使用するコンポーネントをまるっと`QueryClientProvider`でラップします。

`QueryClientProvider`は`new`した`QueryClient`インスタンスと接続し、インスタンスを内部のコンポーネントに提供して使用できるようにしてくれます。
(ここでは一旦`broadcastQueryClient`の存在は無視してください)

TanStack QueryでもSWRと同様、カスタムhooksを用いてデータ取得を各々のコンポーネントで行うため、`props`のバケツリレーを防ぐことができていていいですね!

TanStack Queryでも、データフェッチをカスタムhooksに切り出します。
https://github.com/saku-1101/caching-swing-pages/blob/a9de35ee95420a9049d6a768ef4df0f990eca51d/src/pages/prc-tanstack/hooks/useGithub.ts#L4-L18
こうすることでデータフェッチhooksが再利用可能になり、各コンポーネントでデータフェッチが行えるので、データ取得の責務をコンポーネントに委譲することができてよいです。

Personコンポーネントでユーザ名を更新してみます。
https://github.com/saku-1101/caching-swing-pages/blob/main/src/pages/prc-tanstack/hooks/useMutateUser.ts
https://github.com/saku-1101/caching-swing-pages/blob/a9de35ee95420a9049d6a768ef4df0f990eca51d/src/pages/prc-tanstack/children/user.tsx#L7-L16
TanStack Queryでは更新処理専用の`useMutation` hooksが存在し、その`hooks`が更新・更新時の状態を管理します。

ここから少し細かい話に入ります。

`useMutation` hooksに注目してほしいのですが、これが存在することにより、TanStack Queryでは`mutation`という処理を行っているときの状態が管理できます。つまり、`mutate`が使われたとき＝**データ更新処理が発火したときから**`isPending`という状態を受け取ることができます。

データ更新が正常に行われると、`onSuccess`でその状態を受け取り、`queryClient.invalidateQueries({ queryKey: ["/api/get/user"] });`にて`/api/get/user`をキーにもつリソースの再検証を発行します。

再検証を発行されたリソース（ここではTanStack Queryの`useGetUser`）はデータの再フェッチを行い、そのときの状態は`useGetUser`の内部で用いられている`useQuery`から`isFetching`として受け取ることができます。

#### SWRとTanStack Queryでのmutateの比較
⭐️まとめると、TanStack QueryでuseMutationを用いたときのデータ更新処理は
1. `mutate`でデータ更新をトリガーする
2. データ更新がトリガーされたら`isPending`を返す（Updating...表示）
3. データ更新が完了したら`onSuccess`が状態を受け取り、キーを持つリソースの再検証を発行する(`useGetUser`にデータが古いことを伝えてリフェッチを促す)（Updating...非表示）
4. `useGetUser`が再検証を開始するとともに`isFetching`を返す（⏳loading...表示）
5. `useGetUser`内の`useQuery`の`queryFn`の処理でデータの再フェッチを行う（⏳loading...表示）
6. `queryFn`の処理が完了する（⏳loading...非表示）
![TanStack Queryでのデータ更新時の状態管理](https://storage.googleapis.com/zenn-user-upload/12ef25c872fc-20231119.gif)
*TanStack Queryでのデータ更新時の状態管理*

⭐️SWRを用いたときのデータ更新処理は
1. `fetch`関数が呼び出されてデータ更新が行われる
2. データ更新が完了する
3. `mutate`(key)でキーを持つリソースの再検証を発行する(`useGetUser`にデータが古いことを伝えてリフェッチを促す)
4. `useGetUser`が再検証を開始するとともに`isValidating`を返す（⏳loading...表示）
5. `useGetUser`内の`useSWR`の第二引数の処理でデータの再フェッチを行う（⏳loading...表示）
6. 5の処理が完了する（⏳loading...非表示）
![SWRでのデータ更新時の状態管理](https://storage.googleapis.com/zenn-user-upload/13334e1f67c6-20231119.gif)
*SWRでのデータ更新時の状態管理*

となり、DB update処理中（API内部処理実行中）の状態を、TanStack Queryはwatchできるのに対し、SWRではその機能は提供されていないということになります。

### 結果
少し脇道に逸れましたが、上記の動画より、TanStack QueryもSWRのように`useGetUser`を使用しているコンポーネントでのみ再レンダリングが発火していることがわかります。TanStack Queryもキーによってデータの取得・更新処理を行うか否かを管理しているからです。

また、TanStack Queryにもデータを最新に保つ仕組みが備わっています。Window Focus RefetchingについてSWRと比較して見てみましょう。

#### Window Focus Refetching
v4までは`window`にフォーカスが当たった場合に自動的に再検証が走り、最新のデータに書きかわる、SWR同等の仕様でした。

しかし、こちらの[PR](https://github.com/TanStack/query/pull/4805)により`focus`イベントで再検証が走ることのデメリットが議論された結果、v5からは`focus`イベントではなく`visibilitychange`によって自動的再検証が走るような仕様になっているようです。

![現状focusで再検証が走るSWR](https://storage.googleapis.com/zenn-user-upload/cf1177391cec-20231119.gif)
*現状focusで再検証が走るSWR - devtoolから戻ってきたときや、windowがクリックされたとき、別ディスプレイに行って戻ってきたときにも再検証が走る*

![visibilitychangeで再検証が走るTanStack Query](https://storage.googleapis.com/zenn-user-upload/b50940c18a1f-20231119.gif)
*visibilitychangeで再検証が走るTanStack Query - 単にfocusでは再検証は走らない*

`focus`で再検証が走ることはSWRでも議論されており、[PR](https://github.com/vercel/swr/pull/2672)も出ているので、将来的にはmergeされてTanStack Queryの仕様に近づくのだと思います。🏗️

### リクエストの重複
こちらもSWR同様、リクエストをキーで管理しているので重複が排除されます。
![TanStack Queryを使うと重複したリクエストは排除される](https://storage.googleapis.com/zenn-user-upload/53feaf138836-20231119.png)
*TanStack Queryを使うと重複したリクエストは排除される*

***

今回の記事ではSWRとTanStack Queryを使用したデータフェッチについて、理解を深めていきました。

SWRやTanStack Queryのサードパティー製のフェッチライブラリを使うことで、重複を排除したデータフェッチ、レスポンスのクライアントサイドキャッシュが行えるだけでなく、データ取得・更新時の状態を管理してくれるなどの自前で実装すると少し手の込む内部的なロジックを享受できます。

Reactのクライアントサイドでデータをフェッチする手段として最有力の候補として持っておきたいですね🌟

次回は、Reactのサーバーサイドでデータをフェッチする方法の代表として[Next.js Pages Routerでのデータフェッチ・Next.js App RouterでReact Server Componentsを使用してのデータフェッチ](https://zenn.dev/cybozu_frontend/articles/21a924a294d869)を理解していく記事です。


## 余談 - (TanStack Query)broadcastQueryClientという実験的な機能
TanStack Queryが`window`にフォーカスが当たった場合ではなく`visibilitychange`によってデータの再検証を行う方向になったお話を先ほどしました。

以前TanStack Queryを使用したときは、`window`フォーカスで再検証が行われていたため、今回の調査の時に`window`を二つ開いて一つの`window`でデータを更新した時、もう一つの`window`に戻ってデータが更新されないことに（？）となり、Q&Aを投げてみました。

https://github.com/TanStack/query/discussions/6364

結果、私の確認不足ということで、`v5`から上記の挙動に変わっていました。
しかし、今は`broadcastQueryClient`でアプリレベルで`connection`を張って変更を検知できるようにしている機能を開発してるよという回答をいただき、詳細な仕組みは理解できていませんが、それも試してみました。(実はこれもexperimentalとしてlatestのdocumentには明記されている)
```diff:js page.tsx
"use client";
+import { broadcastQueryClient } from "@tanstack/query-broadcast-client-experimental";
import { QueryClient, QueryClientProvider } from "@tanstack/TanStack Query";
import BackButton from "../_component/back-button";
import LinkButton from "../_component/link-button";
import Content from "./children/content";
import Header from "./children/header";
import { Person } from "./children/user";

export default function TanstackPage() {
	const queryClient = new QueryClient();
+	broadcastQueryClient({
+		queryClient,
+		broadcastChannel: "tanstack-app",
+	});
	return (
		<QueryClientProvider client={queryClient}>
			<div>
				<Header />
				<Content />
				<Person />
				<BackButton />
				<LinkButton link="/prc-swr" label="swr" />
				<LinkButton link="/prc-fetch" label="fetch" />
				<LinkButton link="/legacy-fetch" label="legacy" />
			</div>
		</QueryClientProvider>
	);
}

```
![片方のwindowで更新をかけると、同期的にもう片方のwindowでも値が変更される](https://storage.googleapis.com/zenn-user-upload/75805c98ad7d-20231119.gif)
*片方のwindowで更新をかけると、同期的にもう片方のwindowでも値が変更される*

動作環境：
"@tanstack/query-broadcast-client-experimental": "5.8.3"
"@tanstack/TanStack Query": "5.8.3"