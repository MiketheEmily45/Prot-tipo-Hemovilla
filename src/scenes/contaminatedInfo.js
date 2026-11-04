// Dados e constantes da aba Contaminadas do Guia de Atendimento.
// Isolado em arquivo proprio para permitir edicao facil da lista de doencas e textos.

export const CONTAMINATED_SCREENING_INFO = {
    title: 'TRIAGEM E SEGURANÇA',
    intro: 'No hemocentro, todo sangue doado passa por testes laboratoriais rigorosos. Bolsas reagentes para infecções são descartadas e nunca podem ser transfundidas.',
    diseases: [
        {
            name: 'HIV',
            description: 'Vírus da Imunodeficiência Humana; pode causar a Aids.'
        },
        {
            name: 'Hepatites B e C',
            description: 'Infecções virais graves que afetam as funções do fígado.'
        },
        {
            name: 'Sífilis',
            description: 'Infecção bacteriana que pode ser transmitida pelo sangue.'
        },
        {
            name: 'Doença de Chagas',
            description: 'Infecção parasitária causada pelo Trypanosoma cruzi.'
        }
    ],
    footerNotice: 'Bolsas contaminadas são incompatíveis com qualquer paciente e fazem você perder 1 coração.'
};
