export const getMentionSuggestions = (query: string) => {
  const users = [
    { title: "Alice", id: "user-1", group: "Users" },
    { title: "Bob", id: "user-2", group: "Users" },
    { title: "Charlie", id: "user-3", group: "Users" },
  ];

  const notes = [
    { title: "Project Phoenix", id: "note-1", group: "Notes" },
    { title: "Quarterly Review", id: "note-2", group: "Notes" },
    { title: "Idea Dump", id: "note-3", group: "Notes" },
  ];

  const allItems = [...users, ...notes];

  return allItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  ).map((item) => ({
    title: item.title,
    // The 'id' here is what gets inserted into the document/data
    id: item.id,
    disabled: false,
    badge: item.group 
  }));
};
