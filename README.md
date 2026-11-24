# slackcord

[Open the site](https://tront.xyz/slackcord/) · [GitHub Discussions](https://github.com/TrentSterling/slackcord/discussions)

GitHub Pages serves the public HTML and JSON archive. Each conversation has a permanent site URL and a linked GitHub Discussion. Anyone can read. A GitHub account can start a discussion, reply, or vote on GitHub. When the giscus GitHub App has access to this repository, the next build enables embedded replies and reactions on the conversation pages.

The Publish community workflow runs on main pushes, discussion and comment events, manual dispatch, and a six-hour refresh. The periodic build picks up vote changes and app installation changes. Room archives refresh on open tabs once a minute after publication.

To build locally, authenticate GitHub CLI with read access to this public repository and run **node scripts/build.mjs** with Node 22 or newer from the repository root. Serve the generated **dist/** directory. The public **feed.json** links to each conversation's **data.json**.

Public posts and replies are rendered as escaped text with clickable web links. Use the linked discussion for full GitHub Markdown and moderation. The site ships no GitHub credential.
