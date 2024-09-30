export default function generateDate() {
  const date = new Date();
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear() - 2000; // Assuming you want the last two digits of the year

  return `phone-${month}-${day}-${year}`;
}
