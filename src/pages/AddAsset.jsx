import { saveAsset } from "../utils/storage";
import { useState } from "react";

function AddAsset({ assets, setAssets }) {
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [githubOrg, setGithubOrg] = useState("");

 const handleSubmit = (e) => {
  e.preventDefault();

  saveAsset({
    email,
    domain,
    githubOrg,
  });

  alert("Asset Saved!");

  setEmail("");
  setDomain("");
  setGithubOrg("");
};
  
  return (
    <div>
      <h1>Add Asset</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <br />

        <div>
          <label>Domain:</label>
          <br />
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>

        <br />

        <div>
          <label>GitHub Organization:</label>
          <br />
          <input
            type="text"
            value={githubOrg}
            onChange={(e) => setGithubOrg(e.target.value)}
          />
        </div>

        <br />

        <button type="submit">Save Asset</button>
      </form>
    </div>
  );

}

export default AddAsset;