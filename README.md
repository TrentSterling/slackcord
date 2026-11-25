# slackcord

[Open the site](https://tront.xyz/slackcord/) · [GitHub Discussions](https://github.com/TrentSterling/slackcord/discussions)

GitHub Pages serves the public HTML and JSON archive. Anyone can read. Open **New room**, enter a title, then publish the first message in the embedded giscus composer. GitHub handles sign-in and authorization. Readers can reply and react on the site. Each published conversation has a permanent numbered URL and a linked GitHub Discussion.

The Publish community workflow runs on main pushes, discussion and comment events, manual dispatch, and a six-hour refresh. The periodic build picks up reaction counts and GitHub upvotes.

**Live chat** in an open room connects guests through WebRTC. Join with another person in the same room to exchange temporary messages. The room uses public Nostr relays for discovery. Direct connections depend on both guests’ networks. Use **Room history** for posts that should stay available after everyone leaves. The static archive refreshes in open tabs once a minute after publication.

The self-hosted Trystero 0.26.0 Nostr bundle is the same build used in Dunes. Its dependency notices are in [TRYSTERO-LICENSES.txt](public/vendor/TRYSTERO-LICENSES.txt).

To build locally, authenticate GitHub CLI with read access to this public repository and run **node scripts/build.mjs** with Node 22 or newer from the repository root. Serve the generated **dist/** directory. The public **feed.json** links to each conversation's **data.json**.

Public posts and replies are rendered as escaped text with clickable web links. Use the linked discussion for full GitHub Markdown and moderation. The site ships no GitHub credential.
