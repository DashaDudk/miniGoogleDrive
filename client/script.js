document.getElementById("button").addEventListener("click", async() => {
  try {
    const res = await fetch("/test");
    const data = await res.json();
    document.getElementById("p").textContent = JSON.stringify(data, null, 2);
  } catch(err) {
    document.getElementById("p").textContent = `Помилка: {err}`;
  }
});

document.getElementById("formload").addEventListener()