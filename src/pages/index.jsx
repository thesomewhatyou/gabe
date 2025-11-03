import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";

export default function Home() {
  return (
    <Layout
      title="Gabe Discord Bot"
      description="Documentation hub for Gabe, the snarky Discord bot"
    >
      <main className="hero hero--primary">
        <div className="container">
          <Heading as="h1" className="hero__title">
            Gabe Documentation
          </Heading>
          <p className="hero__subtitle">
            Install, configure, and customize Gabe with detailed guides and
            command references.
          </p>
          <div className="margin-top--lg">
            <Link
              className="button button--primary button--lg"
              to="/docs/intro"
            >
              Explore the Docs
            </Link>
            <Link
              className="button button--outline button--lg margin-left--md"
              to="https://github.com/thesomewhatyou/gabe"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
