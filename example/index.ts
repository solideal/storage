import { Repository, is } from "../src";

(async function () {
  // Let's say you got an object representing bookmarks in your current application
  const bookmark = {
    title: "My super duber website!",
    url: "https://julien.leicher.me",
  };

  // And now you want to save & retrieve this kind of data from your own POD
  const repo = new Repository<typeof bookmark>({
    source: "https://yuukanoo.solid.community/public/bookmarks.ttl",
    type: "https://www.w3.org/2002/01/bookmark#Bookmark",
    schema: {
      title: is.string("http://purl.org/dc/elements/1.1/title"),
      url: is.string("https://www.w3.org/2002/01/bookmark#recalls"),
    },
  });

  const bookmarks = await repo.find();

  console.log(bookmarks);
})();
