import { CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const BackupOption = ({ options, onChange }) => {
  const handleCheckboxChange = (option) => {
    onChange({ ...options, [option]: !options[option] });
  };

  return (
    <div className="flex flex-col gap-y-1.5">
      <CardDescription className="select-none mb-1.5 flex items-center text-md">
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
              className="flex items-center dark:hover:bg-[#673ab790] hover:bg-[#673ab799] rounded-r-[1.75rem]"
            >
              <Checkbox
                id={option} // Use option as ID for better accessibility
                checked={options[option]}
                onCheckedChange={() => handleCheckboxChange(option)}
                className="h-6 w-6 mr-2"
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
