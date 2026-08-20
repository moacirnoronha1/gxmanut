import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";

export function EquipamentoQR({
  open, onOpenChange, equipamentoId, nome, codigo, setor, localizacao,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamentoId: string;
  nome: string;
  codigo?: string | null;
  setor?: string | null;
  localizacao?: string | null;
}) {
  const [img, setImg] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const destino = `${window.location.origin}/equipamentos/${equipamentoId}`;
    setUrl(destino);
    QRCode.toDataURL(destino, { width: 512, margin: 1 }).then(setImg).catch(() => setImg(""));
  }, [open, equipamentoId]);

  function imprimir() {
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>QR ${nome}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:24px}
      img{width:280px;height:280px}h1{font-size:18px;margin:12px 0 4px}p{margin:2px;font-size:13px;color:#444}</style>
      </head><body><img src="${img}" alt="QR Code"/><h1>${nome}</h1>
      <p>${codigo ?? ""}</p><p>${[setor, localizacao].filter(Boolean).join(" · ")}</p>
      <p style="font-size:11px;color:#888">Escaneie para abrir a ficha do equipamento</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code do equipamento</DialogTitle></DialogHeader>
        <div className="space-y-3 text-center">
          {img
            ? <img src={img} alt={`QR Code de ${nome}`} className="mx-auto size-56 rounded border bg-white p-2" />
            : <div className="mx-auto size-56 animate-pulse rounded border bg-muted" />}
          <div>
            <div className="font-semibold">{nome}</div>
            <div className="text-xs text-muted-foreground break-all">{url}</div>
          </div>
          <Button className="w-full" onClick={imprimir} disabled={!img}>
            <Printer className="mr-2 size-4" /> Imprimir etiqueta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
