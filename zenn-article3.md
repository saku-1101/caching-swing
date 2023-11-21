「Reactのさまざまなデータフェッチ方法を比較して理解して正しく使用する」シリーズの3記事目、最終記事です🌟

今回は「Pages RouterとApp Routerでのデータフェッチ」についてです。
1. イントロ+useEffectを用いたデータフェッチ
2. SWR・TanStack Queryを用いたデータフェッチ
3. Pages Router(SSR)でのデータフェッチ+App Routerでのデータフェッチ+まとめ ← 👀この記事

## Repository
以下は今シリーズで用いたリポジトリです。

🔽クライアントサイドフェッチの調査に用いたリポジトリ：React+Vite（useEffect, SWR・TanStack Query）
https://github.com/saku-1101/caching-swing-csr
🔽サーバーサイドフェッチの調査に用いたリポジトリ：Next.js Pages Router, App Router
https://github.com/saku-1101/caching-swing-pages
https://github.com/saku-1101/caching-swing

## Pages Router(SSR)でのデータフェッチ
Next.jsのPages Routerでは標準で SSR (Server Side Rendering) 機能が提供されており、上手く活用することでパフォーマンス・SEOの両面で恩恵を受けられます。
[Pre-rendering and Data Fetching](https://nextjs.org/learn-pages-router/basics/data-fetching/pre-rendering)
[Rendering](https://nextjs.org/docs/pages/building-your-application/rendering)
![SSRとCSRの比較](https://storage.googleapis.com/zenn-user-upload/8b09363de1b8-20231119.png)
*SSRとCSRの比較 （Learn Next.js - Pre-rendering and Data Fetching より引用）*

もちろん、Next.jsではSSRをしつつも、useEffectなどを使用してデータフェッチをクライアントサイドに寄せることができます。

しかし、サーバサイドでデータフェッチを行うことで、SEO対策が施しやすかったり、レイアウトシフトの軽減など、パフォーマンス面で恩恵を受けられる可能性があります。

これらは、サーバサイドでデータ取得まで行い、初期データが注入されたHTML(+HydrationのためのJS)をブラウザに返却するSSRで実現することができます。

### Pages Router(SSR)でのデータフェッチの調査
そんなSSRが可能なNext.jsのPages Router環境でデータフェッチの調査をしていきます💫

Next.jsでは、SSR時の初期データの注入は`getServerSideProps`という非同期の関数を`export`することによって実現できます。
https://github.com/saku-1101/caching-swing-pages/blob/9f7495226371929c6e817265edf989ecf2e74d7e/src/pages/ssr-fetch/index.tsx#L19-L72
今回のサンプルでは、`getServerSideProps` の中で直接レンダリング時に必要となるデータを取得しています。
取得したデータを`props`プロパティを持つオブジェクトとして`return`することで、SSR時にそのデータが`props`としてJSX(TSX)に注入されます。

#### API Routes との使い分け
ところで、`getServerSideProps`内でNext.jsのAPI Routesで定義したAPIを使わず、`getRandomNumber()` や `getUer()`といったAPIの内部処理を直接使用したのはなぜだったのでしょうか？

もし`getServerSideProps`に`fetch('${process.env.BASE_URL}/route/to/api')`などを渡してしまうと、サーバ上で`getServerSideProps`に加えてAPIそのものが実行される`API Routes`のどちらも実行され、余計なリクエストが発生してしまうからです。
> It can be tempting to reach for an API Route when you want to fetch data from the server, then call that API route from getServerSideProps. This is an unnecessary and inefficient approach, as it will cause an extra request to be made due to both getServerSideProps and API Routes running on the server.

https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props#getserversideprops-or-api-routes

先ほどの例で考えてみると、`getRandomNumber()` や `getUer()` と同等の処理内容を返す API Routes が存在していたとしても、それを`getServerSideProps`から`fetch()`などで呼び出すことは避け、内部ロジックのみを流用して直接実行することが推奨されます。

次の例のように`getServerSideProps`から API Route で定義したAPIにリクエストを送ると、二重でリクエストが発生します。特別な理由がない限りはこのような書き方は避けたほうが望ましいです。

🔽 次のコードのように、`getServerSideProps`内でAPI Routeで定義したAPIにリクエストを送ると二重にリクエストを送ることになる
```js:index.ts
const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  }).then((res) => res.json())
  
export async function getServerSideProps() {
  console.time("ssr");

  const props = Promise.all([
    fetcher("https://api.github.com/repos/vercel/next.js"),
    fetcher(`${process.env.BASE_URL}/api/get/unstable/data`),
    fetcher(`${process.env.BASE_URL}/api/get/user`),
  ])
    .then(([data, randomNumber, user]) => {
      console.timeEnd("ssr");
      return { props: { data, randomNumber, user } };
    })
    .catch((err) => {
      log(err);
    });
  return props;
}
```

`getServerSideProps`でサーバサイドのデータフェッチの仕組みを完成させたところで、実際にその様子をのぞいてみましょう👀

データ取得がどこで行われているかを確認するために`getServerSideProps`の中に`console.time();`　`console.timeEnd();`を仕込みました。
サーバターミナルにデータ取得にかかった秒数が表示されるのか、ブラウザのコンソールタブに表示されるのかをみてみます。

SSRのページをリロードしてデータを再取得してみます。
![ブラウザ](https://storage.googleapis.com/zenn-user-upload/877bd7e91f8f-20231121.gif)
*ブラウザコンソールの表示*
ブラウザコンソールには何も表示されていないようです。
localhostのターミナルはどうでしょうか？
![ターミナル](https://storage.googleapis.com/zenn-user-upload/0794ffbf606c-20231119.png)
*ターミナルの表示*
こちらにデータ取得にxxx msかかったとログが出ていました！
きちんとサーバサイドフェッチできてますね🙌🏻

このように、`getServerSideProps`を使用するとデータ取得の処理をサーバ側で行うことができ、SSR時のレンダリング結果に含めることができます。

また、ネットワークスロットリングをしても、サーバ側でデータ取得の処理をしているのでその影響を受けません。（レンダリング後のHTMLをDLする時はその限りではありません）

それでは、Personコンポーネントでユーザ名を更新してみましょう🤾🏻‍♀️
https://github.com/saku-1101/caching-swing-pages/blob/9f7495226371929c6e817265edf989ecf2e74d7e/src/pages/ssr-fetch/children/user.tsx#L6-L19
`body`に`form`からのデータを付与したPOSTリクエストを`/api/update/user`に送ると、DBの値が更新されます。通常通りです。

更新したデータをUIに反映します。
https://github.com/saku-1101/caching-swing-pages/blob/9f7495226371929c6e817265edf989ecf2e74d7e/src/pages/ssr-fetch/children/user.tsx#L18
ここではNext.jsのPages Routerを使用しているので`next/router`からエクスポートされているuseRouterの機能`router.reload();`を利用して再レンダリングをトリガーしました。

### 結果
`getServerSideProps`を用いた時のデータ取得・更新の挙動です。
![SSR data fetch](https://storage.googleapis.com/zenn-user-upload/a10410d73f28-20231119.gif)
*SSR時にデータを取得しているので、データが注入された状態のHTMLのみが送られてくる*

### `getServerSideProps`の特徴
`getServerSideProps`の利用が許可されているのはpageからのみで、それぞれの子コンポーネントが`getServerSideProps`をデータフェッチのために独立して使うということはないです。
[When does getServerSideProps run](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props#when-does-getserversideprops-run)
> getServerSideProps can only be exported from a page. You can’t export it from non-page files.

したがって、pageの`getServerSideProps`で取得されたデータをpropsでバケツリレー式に子コンポーネントに渡していく形となります。（つまり、コンポーネントとデータの依存関係を剥がすことは難しそうです。）

#### (余談)`getServerSideProps`のリクエストのキャッシュ
pageで使用されている`getServerSideProps`のリクエストのキャッシュは本番環境でのみ、以下の設定を加えることで可能なようです。
（※今回は開発環境での調査のみ行なっているため、この機能は利用していません）
https://nextjs.org/docs/pages/building-your-application/deploying/production-checklist#caching

## App Routerでのデータフェッチ
最後に、Next.js App Routerのキャッシュ機構を用いたデータフェッチと再検証を見ていきます。

### App Routerでのデータフェッチの調査
RSC(React Server Components)をNext.js App Router環境で使用します。

（page.tsx）
https://github.com/saku-1101/caching-swing/blob/85aa6baca8ec4ef5f7148a5c57f4e6a5d0072877/src/app/prc-fetch/page.tsx#L8-L24
（e.g.; header.tsx）
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/children/header.tsx
Personコンポーネント以外はRSCとして、それぞれコンポーネント内でfetch関数を直接呼び出してデータの取得を行います。

`loading`に関しては、React18からstableで提供され始めた`Suspense`を用いることでコンポーネントの`Promise`をキャッチして`fallback`の内容を返すことができます。
Next.js v13以降でページレベルで`loading`を制御したい場合は`loading.jsx(tsx)`を`page.jsx(tsx)`と同階層に置くことで対応できます。
(※上記のRSCでは`Suspense`の動作を確認するために、意図的にsleep関数を仕込んでいます)

また、error boundaryに関しては、Reactからは`Suspense`のようにfunction componentとして提供されているものはないようです。
しかし、独自で Class Component として定義する必要はなく、[React のドキュメント](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)では、[react-error-boundary](https://github.com/bvaughn/react-error-boundary)の利用などが代替手段として紹介されています。
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/error.tsx
もしNext.js v13以降でページレベルで`error`を制御したい場合は、**Client Componentとして**`error.jsx(tsx)`を`loading`と同様`page.jsx(tsx)`と同階層に置くことで対応できます。

それでは、Personコンポーネント内のformを用いてユーザ名を更新してみましょう。
ここではServer Actionsを用いて更新処理を行います。(調査環境: Next.js v14.0.2)
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/actions/handleUpdateUserName.ts
https://github.com/saku-1101/caching-swing/blob/main/src/app/prc-fetch/children/user.tsx
Server Actionsの細かな説明は割愛しますが、`/app/api`内部でしていた処理と同等の処理を行っています。Server ActionsからORMを介して直接DBを更新する処理です。

ここで注目したいのが`revalidateTag("user");`の部分です。
https://github.com/saku-1101/caching-swing/blob/6bba6e5f662018c0cc3bdb68fb58c09e9b3de3f5/src/app/prc-fetch/actions/handleUpdateUserName.ts#L14
https://github.com/saku-1101/caching-swing/blob/6bba6e5f662018c0cc3bdb68fb58c09e9b3de3f5/src/app/prc-fetch/children/form-output.tsx#L6-L9
`fetch`の際のoptionとして`{ next: { tags: [tag] } }`が渡されたものに関しては、これがデータの再検証の際のキャッシュのタグとして紐付けられます。
Server Actionsでデータ更新後に`revalidateTag(tag);`を行うとNext.js組み込みのData Cacheストレージからそのタグに紐づけられたキャッシュが再検証されて最新のデータに置き換わります。

### 結果
RSCのfetchを用いたときのデータ取得・更新の挙動です。
![fetch in App Router](https://storage.googleapis.com/zenn-user-upload/f4631a74b0da-20231117.gif)
*RSC, App Routerでのデータ取得*

### リクエストの重複
#### Request Memoization
Reactには[Request Memoization](https://nextjs.org/docs/app/building-your-application/caching#request-memoization)という機能が備わっており、`fetch`を用いたリクエストをメモ化し、キャッシュサーバへのリクエストの重複を排除してくれます。SWRやTanStack Queryで内部的に用いられていたContext Providerの仕組みがキャッシュによって実現されているイメージです。

さらに、[Router Cache](https://nextjs.org/docs/app/building-your-application/caching#router-cache)という機能により、各ルートへのリクエスト結果がインメモリのクライアントサイドストレージにキャッシュされているため、次の描画までの時間([INP](https://web.dev/articles/inp?hl=ja))も削減されます。
異なるページを行き来すると、キャッシュされていたRSC payloadが、独自のデータフォーマットで返却されていることがわかります。
![クライアントサイドインメモリキャッシュ](https://storage.googleapis.com/zenn-user-upload/6c610dd40f0a-20231121.png)
*クライアントサイドインメモリキャッシュのおかげでセッション期間中は都度サーバにアクセスしない*

このほかにも、多くのキャッシュの仕組みによってNext.js App Routerでのデータフェッチは最適化されています。
https://nextjs.org/docs/app/building-your-application/caching

## 全体の結果
今回の３シリーズの調査をまとめた結果です✉️

### フェッチの分類
| RSC(in App Router) | getServerSideProps | SWR | TanStack Query | useEffect |
| ---- | ---- | ---- | ---- | ---- |
| サーバサイドフェッチ | サーバサイドフェッチ | クライアントサイドフェッチ  | クライアントサイドフェッチ | クライアントサイドフェッチ |

* RSC: React Server Components

### 結局いつどれ使ったらいいの
|  | RSC(in App Router) | getServerSideProps | SWR | TanStack Query | useEffect |
| ---- | ---- | ---- | ---- | ---- | ---- |
| CSR | ❌ | ❌ | ⭕️  | ⭕️ | 🔼 |
| SSR：各コンポーネントでデータフェッチを行う | ❌ | 各コンポーネントでのデータフェッチは想定されない(❌) | サーバサイドでデータフェッチができいないとき（⭕️） | サーバサイドでデータフェッチができいないとき（⭕️） | サーバサイドでデータフェッチができいないとき（🔼） |
| SSR:SSR時にデータ取得 | ❌ | ⭕️（getServerSidePropsに限らず、該当SSRライブラリのAPIを使用） | サーバサイドでデータフェッチができいないとき（⭕️） | サーバサイドでデータフェッチができいないとき（⭕️） | サーバサイドでデータフェッチができいないとき（🔼） |
| Next.js App Router | ⭕️ | RSCを使うので使用しない(❌) | サーバサイドでデータフェッチができいないとき（⭕️） | サーバサイドでデータフェッチができいないとき（⭕️） | サーバサイドでデータフェッチができいないとき（🔼） |

* RSC: React Server Components
* ⭕️: 使いたい
* 🔼: それ以外のアプローチが使えない場合に最終手段として使用
* ❌: 使えない

### それぞれの特徴まとめ
|  | RSC(in App Router) | getServerSideProps　| SWR | TanStack Query | useEffect |
| ---- | ---- | ---- | ---- | ---- | ---- |
| フェッチの特徴 | コンポーネント単位でのデータフェッチ/ページ単位でのSSR | ページ単位でのデータフェッチ/ページ単位でのSSR | コンポーネント単位でのデータフェッチ/子コンポーネント単位でのレンダリング  | コンポーネント単位でのデータフェッチ/子コンポーネント単位でのレンダリング | コンポーネント単位でのデータフェッチは基本的に行わない/useEffectを使用しているすべてのコンポーネントで起こる |
| キャッシュ |　[Request Memoization](https://nextjs.org/docs/app/building-your-application/caching#request-memoization)によるリクエスト重複排除(@Server)/ [Data Cache](https://nextjs.org/docs/app/building-your-application/caching#data-cache)によるリクエスト結果のキャッシュ(@Server)/ [Full Route Cache](https://nextjs.org/docs/app/building-your-application/caching#full-route-cache)によるHTMLとRSC payloadのキャッシュ(@Server)/ [Router Cache](https://nextjs.org/docs/app/building-your-application/caching#router-cache)によるRSC payloadのルートごとのキャッシュ(@Client)　| 本番環境でのみ(⭕️)|　⭕️　|　⭕️　|　❌　|
| 状態表示(loading, 再検証など) | クライアントサイドデータフェッチライブラリと比較して煩雑さ[^1]を感じる(🔼) | ❌ |　⭕️　|　⭕️　| 難しい(❌)　|
| リクエスト重複排除 |　⭕️　|　❌　|　⭕️　|　⭕️　|　❌　|
* ⭕️: できる
* 🔼: できるが他に劣る
* ❌: できない

## まとめ
自分の中で挙動や理解がまとまっていなかった、Reactにおけるさまざまなデータフェッチ・管理方法を広く浅くまとめることができて良い機会だったと思います。

まとめると、
1. Next.jsなどのフレームワークを使用している場合は、組み込みのデータフェッチを利用する
2. フレームワークを利用しない場合はSWRやTanStack Queryなど、クライアントサイドキャッシュを利用できるライブラリを検討する
3. それ以外の場合・どちらも使えない場合はuseEffectで直接データフェッチをする

となり、useEffectの出番は稀になりそうです。

それぞれのデータフェッチ方法の個性を活かしつつ、敵最適所で使っていきたいと思います！
OSSいつもありがとう！🙌🏻

## 参考
https://zenn.dev/akfm/articles/next-app-router-client-cache#request-deduping

[^1]: SWRやTanStack Queryのようなクライアントサイドライブラリだと、独自実装せずともloading, 再検証などの状態を戻り値として返却してくれるため。RSC(in App Router)だと`Suspense`や`Error Boundary`は設けられますが、SWRやTanStack Queryの状態管理と比較すると、細かな制御が難しい印象のため、「比較的煩雑」としました。