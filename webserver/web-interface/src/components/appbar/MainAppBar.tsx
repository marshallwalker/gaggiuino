import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Coffee, Settings as SettingsIcon, SlidersHorizontal } from 'lucide-react';
import useWebSocket from 'react-use-websocket';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Logo from '../icons/Logo';
import ThemeModeToggle from '../theme/ThemeModeToggle';
import ShotDialog from '../../pages/home/ShotDialog';
import {
  MSG_TYPE_SHOT_DATA, apiHost, filterJsonMessage, filterSocketMessage, ShotData, WsEnvelope,
} from '../../models/api';

interface MenuItemDef {
  label: string;
  icon: React.ReactNode;
}

const menuItems: Record<string, MenuItemDef> = {
  '/': { label: 'Home', icon: <Coffee className="h-4 w-4" /> },
  '/profiles': { label: 'Profiles', icon: <SlidersHorizontal className="h-4 w-4" /> },
  '/settings': { label: 'Settings', icon: <SettingsIcon className="h-4 w-4" /> },
};

interface NavProps {
  activeItem: string;
  onChange: (value: string) => void;
}

function TabNav({ activeItem, onChange }: NavProps) {
  return (
    <Tabs value={activeItem} onValueChange={onChange} className="hidden sm:block">
      <TabsList className="bg-transparent gap-1">
        {Object.entries(menuItems).map(([path, item]) => (
          <TabsTrigger key={path} value={path} className="text-primary-foreground/80 data-[state=active]:text-primary-foreground data-[state=active]:bg-primary-foreground/10">
            {item.icon}
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function DropdownNav({ activeItem, onChange }: NavProps) {
  const navigate = useNavigate();
  const active = menuItems[activeItem] ?? menuItems['/'];

  return (
    <div className="sm:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            {active.icon}
            {active.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.entries(menuItems).map(([path, item]) => (
            <DropdownMenuItem
              key={path}
              onSelect={() => {
                onChange(path);
                navigate(path);
              }}
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function MainAppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(location.pathname || '/');
  const [shotDialogOpen, setShotDialogOpen] = useState(false);
  const { lastJsonMessage } = useWebSocket(`ws://${apiHost}/ws`, {
    share: true,
    retryOnError: true,
    shouldReconnect: () => true,
    reconnectAttempts: 1000,
    filter: (message) => filterSocketMessage(message, MSG_TYPE_SHOT_DATA),
  });

  useEffect(() => {
    const envelope = lastJsonMessage as WsEnvelope<ShotData> | null;
    if (envelope !== null && filterJsonMessage(envelope, MSG_TYPE_SHOT_DATA)) {
      setShotDialogOpen(true);
    }
  }, [lastJsonMessage]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(value);
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-sm">
      <div className="flex items-center gap-3 px-4 py-2">
        <button
          type="button"
          onClick={() => setShotDialogOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary shadow-sm hover:bg-background/90"
          aria-label="Open shot view"
        >
          <Logo size={26} />
        </button>
        <div className="flex-1" />
        <TabNav activeItem={activeTab} onChange={handleTabChange} />
        <DropdownNav activeItem={activeTab} onChange={setActiveTab} />
        <ThemeModeToggle />
      </div>
      {shotDialogOpen && <ShotDialog open={shotDialogOpen} setOpen={setShotDialogOpen} />}
    </header>
  );
}
