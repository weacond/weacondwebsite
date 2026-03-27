export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/weacond/weacondwebsite/refs/heads/main/data/ebooks.json"
    );

    const data = await response.json();

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "failed" });
  }
}
