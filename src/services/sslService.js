import axios from "axios";

export async function checkSSL(domain) {
  try {
    const response = await axios.get(
      `https://crt.sh/?q=${domain}&output=json`
    );

    const certs = response.data;

    if (!certs.length) {
      return null;
    }

    const latest = certs[0];

    const expiryDate = new Date(
      latest.not_after
    );

    const daysLeft = Math.ceil(
      (expiryDate - new Date()) /
      (1000 * 60 * 60 * 24)
    );

    return {
      domain,
      expiryDate,
      daysLeft,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}