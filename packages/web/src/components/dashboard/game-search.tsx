import { ActionIcon, TextInput } from "@mantine/core";
import { useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { UNO_ICON_COLOR } from "@/theme";

interface GameSearchProps {
  onSearchChange: (query: string) => void;
}

const GameSearch = ({ onSearchChange }: GameSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange(value);
  };

  const handleClear = () => {
    setSearchQuery("");
    onSearchChange("");
  };

  return (
    <TextInput
      placeholder="Search by player name or game status ..."
      leftSection={<FaSearch color={UNO_ICON_COLOR} />}
      rightSection={
        searchQuery && (
          <ActionIcon variant="subtle" color="gray" onClick={handleClear}>
            <FaTimes />
          </ActionIcon>
        )
      }
      size="md"
      value={searchQuery}
      onChange={(e) => handleSearchChange(e.currentTarget.value)}
    />
  );
};

export default GameSearch;
