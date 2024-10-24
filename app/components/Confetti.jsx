import Confetti from "react-confetti-boom";

const ConfettiExplosion = () => {
  return (
    <Confetti
      mode="boom"
      width="50%"
      height="50%"
      particleCount={69}
      colors={[
        "#ff577f",
        "#ff884b",
        "#ff3967",
        "#ff884b",
        "#ffd384",
        "#fff9b0",
      ]}
    />
  );
};

export default ConfettiExplosion;
