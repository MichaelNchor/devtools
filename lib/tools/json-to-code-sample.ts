export const JSON_TO_CODE_SAMPLE = {
  input: JSON.stringify(
    {
      id: 42,
      display_name: "Ada Lovelace",
      active: true,
      score: 99.5,
      bio: null,
      tags: ["engineer", "mathematician"],
      address: { city: "London", postcode: "NW1" },
      sessions: [
        { id: 1, device: "laptop" },
        { id: 2, device: "phone", referrer: "search" },
      ],
    },
    null,
    2,
  ),
  rootName: "User",
};
