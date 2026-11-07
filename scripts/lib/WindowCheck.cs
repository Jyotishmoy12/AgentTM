using System;
using System.Runtime.InteropServices;
using System.Text;

public static class AgentTMWindowCheck
{
    public delegate bool Callback(IntPtr handle, IntPtr value);

    [DllImport("user32.dll")]
    static extern bool EnumWindows(Callback callback, IntPtr value);

    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr handle, out uint process);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    static extern int GetWindowText(IntPtr handle, StringBuilder text, int count);

    public static bool Exists(int process)
    {
        bool found = false;
        EnumWindows((handle, value) =>
        {
            uint owner;
            GetWindowThreadProcessId(handle, out owner);
            if (owner == process)
            {
                var text = new StringBuilder(512);
                GetWindowText(handle, text, 512);
                if (text.ToString() == "AgentTM") found = true;
            }
            return true;
        }, IntPtr.Zero);
        return found;
    }
}
