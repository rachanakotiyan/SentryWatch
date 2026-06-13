export const saveAsset = (asset) => {
  const assets = getAssets();

  assets.push({
    ...asset,
    id: Date.now(),
  });

  localStorage.setItem("sw_assets", JSON.stringify(assets));
};

export const getAssets = () => {
  return JSON.parse(localStorage.getItem("sw_assets") || "[]");
};