import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const BackupOption = ({ options, onChange }) => {
  const handleCheckboxChange = (option) => {
    onChange({ ...options, [option]: !options[option] });
  };

  return (
    <div className="flex flex-col gap-y-1.5 ">
      <CardDescription className="select-none flex items-center text-md">
        Source
      </CardDescription>
      {Object.keys(options)
        .filter((option) => option !== "destInputValue")
        .map(
          (
            option // Filter out "destInputValue"
          ) => (
            <div
              key={option}
              className="py-[0.069rem] bg-secondary/50 flex items-center hover:bg-secondary rounded-r-[1.75rem] "
            >
              <Checkbox
                id={option} // Use option as ID for better accessibility
                checked={options[option]}
                onCheckedChange={() => handleCheckboxChange(option)}
                className="size-5 mr-2"
              />
              <label
                htmlFor={option}
                className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option} {/* Display the actual option name */}
              </label>
            </div>
          )
        )}
    </div>
  );
};

export default BackupOption;
