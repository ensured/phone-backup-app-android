import { Loader2 } from "lucide-react";
const loading = () => {
  return (
    <div className="h-[69vh] w-screen flex justify-center items-center">
      <Loader2 className="animate-spin" size={50} />
    </div>
  );
};

export default loading;
